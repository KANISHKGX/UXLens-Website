"""
User flow & main page discovery (spec step 4).

Discovers the top 5 user flows for a site (e.g. "Home Loan & Mortgage",
"Account Login", "Personal Banking") and, for each, the single main page that
best represents that flow for heuristic evaluation. Mirrors the scrape-first,
GPT-fallback strategy in ../backend/services/page_discovery.py, but frames the
GPT prompt around *user flows* rather than raw navigation pages, since a flow
and its representative page are what the frontend's Overall Summary /
heuristic-by-flow views need (Section 7 of the spec).
"""

import httpx
import json
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from openai import AsyncOpenAI
from config import settings
from models import UserFlow, MainPage

_MIN_SCRAPED = 5


def _clean_json(raw: str) -> str:
    raw = (raw or "").strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


async def _scrape_nav_links(url: str) -> list[dict]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            res = await client.get(url, headers=headers)

        soup = BeautifulSoup(res.text, "html.parser")
        base = urlparse(url)
        base_domain = base.netloc.lower().replace("www.", "")

        links: list[dict] = []
        seen_paths: set[str] = set()
        containers = soup.find_all(["nav", "header", "footer"]) or [soup.body or soup]

        for container in containers:
            for a in container.find_all("a", href=True):
                href = (a.get("href") or "").strip()
                if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
                    continue
                full = urljoin(url, href)
                parsed = urlparse(full)
                if parsed.netloc.lower().replace("www.", "") != base_domain:
                    continue
                path = parsed.path.rstrip("/") or "/"
                if any(path.lower().endswith(ext) for ext in [
                    ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
                    ".pdf", ".xml", ".json", ".txt", ".zip", ".woff", ".woff2", ".mp4", ".webp",
                ]):
                    continue
                if path in seen_paths:
                    continue
                seen_paths.add(path)
                text = a.get_text(separator=" ", strip=True)
                if not text or len(text) < 2 or len(text) > 60:
                    continue
                links.append({"text": text, "path": path, "url": f"{parsed.scheme}://{parsed.netloc}{path}"})

        if "/" not in seen_paths:
            links.insert(0, {"text": "Homepage", "path": "/", "url": f"{base.scheme}://{base.netloc}/"})

        print(f"[flows] {len(links)} nav links scraped from {url}")
        return links[:40]
    except Exception as exc:
        print(f"[flows] Scrape failed for {url}: {exc}")
        return [{"text": "Homepage", "path": "/", "url": url}]


def _fallback_flows(base_url: str) -> list[UserFlow]:
    defaults = [
        ("flow-homepage", "Homepage Experience", "homepage", "Homepage", "/"),
        ("flow-browse", "Browse / Discovery", "browse", "Browse", "/search"),
        ("flow-product", "Product / Detail View", "product", "Product Detail", "/product"),
        ("flow-pricing", "Pricing / Plans", "pricing", "Pricing", "/pricing"),
        ("flow-contact", "Contact / Support", "contact", "Contact", "/contact"),
    ]
    return [
        UserFlow(id=fid, name=name, main_page=MainPage(key=key, label=label, path=path, url=base_url.rstrip("/") + path))
        for fid, name, key, label, path in defaults
    ]


async def discover_user_flows(base_url: str, business_category: str, max_flows: int = 5) -> list[UserFlow]:
    """
    Returns up to `max_flows` UserFlow objects, each with one representative
    main page. Uses scraped nav links as grounding context when available,
    falls back to GPT domain knowledge for JS-heavy sites, and to a generic
    fallback list if both fail.
    """
    links = await _scrape_nav_links(base_url)
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    links_text = "\n".join(f'  - "{l["text"]}": {l["path"]}' for l in links[:30]) if len(links) >= _MIN_SCRAPED else "(no reliable navigation scraped — use domain knowledge)"

    system = (
        "You are a UX researcher identifying the most important USER FLOWS on a website "
        "for a heuristic evaluation, given the site's business category.\n\n"
        "A 'user flow' is a top-level user journey (e.g. 'Home Loan & Mortgage', "
        "'Account Login', 'Personal Banking', 'Checkout', 'Booking a Room'), NOT a raw nav link.\n"
        f"Return up to {max_flows} flows, each with ONE representative main page to evaluate.\n\n"
        'Return ONLY JSON: {"flows": [{"flow_name": str, "page_key": str, "page_label": str, "page_path": str}]}\n'
        "- page_key: lowercase kebab-case slug\n"
        "- page_path: a real URL path on this domain if you can infer it, else a sensible guess\n"
        "- Always make the first flow represent the Homepage\n"
        "- Return ONLY valid JSON, no markdown fences."
    )
    user_msg = (
        f"Website: {base_url}\n"
        f"Business category: {business_category}\n"
        f"Scraped navigation:\n{links_text}\n\n"
        f"Identify the top {max_flows} user flows and their main pages."
    )

    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=900,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
        )
        data = json.loads(_clean_json(res.choices[0].message.content or "{}"))
        raw_flows = data.get("flows", []) if isinstance(data, dict) else []

        flows: list[UserFlow] = []
        for i, f in enumerate(raw_flows[:max_flows] if isinstance(raw_flows, list) else []):
            if not isinstance(f, dict) or not f.get("flow_name"):
                continue
            path = str(f.get("page_path", "/")) or "/"
            flows.append(UserFlow(
                id=f"flow-{i + 1}-{re.sub(r'[^a-z0-9]+', '-', str(f.get('page_key', f'flow-{i+1}')).lower()).strip('-')}",
                name=str(f["flow_name"]),
                main_page=MainPage(
                    key=str(f.get("page_key", f"page-{i+1}")),
                    label=str(f.get("page_label", f["flow_name"])),
                    path=path,
                    url=base_url.rstrip("/") + path,
                ),
            ))

        if flows:
            print(f"[flows] GPT returned {len(flows)} user flows")
            return flows
        raise ValueError("GPT returned no valid flows")

    except Exception as exc:
        print(f"[flows] discover_user_flows failed: {exc} — using generic fallback")
        return _fallback_flows(base_url)[:max_flows]
