"""
Company & market intelligence service (OpenAI / ChatGPT only).

Covers spec steps 1 and 3:
  Step 1: company name + top 5 competitors
  Step 3: business category classification (Ecommerce / Hospitality / Insurance /
          Banking / etc.)

Uses GPT-4o-mini for cheap, fast structured JSON extraction. No Gemini anywhere
in this backend, per the project requirement.
"""

import base64
import json
import re
from openai import AsyncOpenAI
from config import settings
from models import CompanyIntel, Competitor, BusinessCategoryResult, BUSINESS_CATEGORIES


def _clean_json(raw: str) -> str:
    raw = (raw or "").strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


async def get_company_intel(base_url: str, company_hint: str) -> CompanyIntel:
    """Resolve the official company name and its top 5 competitors."""
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    from urllib.parse import urlparse
    domain = urlparse(base_url).netloc.replace("www.", "")

    system = (
        "You are a market intelligence analyst. Given a company's website domain, "
        "identify the company's real/official name and its top 5 direct competitors.\n\n"
        'Return ONLY JSON: {"company_name": str, "competitors": '
        '[{"name": str, "domain": str, "reason": str}]} (exactly 5 competitors).\n'
        "- domain: the competitor's primary website domain (e.g. 'chase.com')\n"
        "- reason: one short phrase on why they compete (<= 12 words)\n"
        "- Use your knowledge of the real company at this domain.\n"
        "- Return ONLY valid JSON, no markdown fences."
    )
    user_msg = f"Website domain: {domain}\nHint/slug: {company_hint}\nIdentify the company and its top 5 competitors."

    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=700,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
        )
        data = json.loads(_clean_json(res.choices[0].message.content or "{}"))
        name = str(data.get("company_name") or company_hint.capitalize())
        raw_comp = data.get("competitors", [])
        competitors = []
        for c in raw_comp[:5] if isinstance(raw_comp, list) else []:
            if isinstance(c, dict) and c.get("name"):
                competitors.append(Competitor(
                    name=str(c.get("name")),
                    domain=str(c.get("domain", "")),
                    reason=str(c.get("reason", "")),
                ))
        return CompanyIntel(company_name=name, domain=domain, competitors=competitors)

    except Exception as exc:
        print(f"[intel] get_company_intel failed: {exc} — using fallback")
        return CompanyIntel(company_name=company_hint.capitalize(), domain=domain, competitors=[])


async def classify_business_category(company_name: str, domain: str) -> BusinessCategoryResult:
    """Classify the company into one of the fixed BUSINESS_CATEGORIES."""
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    system = (
        "You are a business analyst classifying companies by industry vertical.\n"
        f"Choose exactly one category from this list: {', '.join(BUSINESS_CATEGORIES)}.\n\n"
        'Return ONLY JSON: {"category": str, "confidence": float (0-1), "rationale": str (<=20 words)}\n'
        "Return ONLY valid JSON, no markdown fences."
    )
    user_msg = f"Company: {company_name}\nDomain: {domain}\nClassify this company's primary business category."

    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=200,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
        )
        data = json.loads(_clean_json(res.choices[0].message.content or "{}"))
        category = str(data.get("category", "Other"))
        if category not in BUSINESS_CATEGORIES:
            category = "Other"
        return BusinessCategoryResult(
            category=category,
            confidence=float(data.get("confidence", 0.5) or 0.5),
            rationale=str(data.get("rationale", "")),
        )
    except Exception as exc:
        print(f"[intel] classify_business_category failed: {exc} — defaulting to 'Other'")
        return BusinessCategoryResult(category="Other", confidence=0.0, rationale="classification failed")


async def identify_from_screenshot(image_bytes: bytes) -> dict:
    """Used for the uploaded-image flow, where there is no company name or
    URL to resolve — only a screenshot. Asks GPT-4o Vision to read the page's
    logo/header/content and infer both the real company name and its
    business category, so an uploaded Amazon screenshot produces a report
    labelled "Amazon" / "Ecommerce" instead of a generic placeholder.
    Returns {"company_name": str, "category": str, "confidence": float, "rationale": str}.
    """
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    encoded = base64.b64encode(image_bytes).decode("utf-8")

    system = (
        "You are a market intelligence analyst. Look at this website screenshot and "
        "identify the real company/brand it belongs to (from its logo, header, "
        "visible text, layout, etc.) and classify its primary business category.\n\n"
        f"Choose exactly one category from this list: {', '.join(BUSINESS_CATEGORIES)}.\n\n"
        'Return ONLY JSON: {"company_name": str, "category": str, '
        '"confidence": float (0-1), "rationale": str (<=20 words)}\n'
        "If you cannot identify a specific company, set company_name to a short, "
        "generic description of the page (e.g. 'E-commerce Product Page').\n"
        "Return ONLY valid JSON, no markdown fences."
    )

    try:
        res = await client.chat.completions.create(
            model="gpt-4o",
            max_tokens=250,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}", "detail": "high"}},
                    {"type": "text", "text": "Identify the company/brand and business category for this screenshot."},
                ]},
            ],
        )
        data = json.loads(_clean_json(res.choices[0].message.content or "{}"))
        category = str(data.get("category", "Other"))
        if category not in BUSINESS_CATEGORIES:
            category = "Other"
        return {
            "company_name": str(data.get("company_name") or "Uploaded Image"),
            "category": category,
            "confidence": float(data.get("confidence", 0.5) or 0.5),
            "rationale": str(data.get("rationale", "")),
        }
    except Exception as exc:
        print(f"[intel] identify_from_screenshot failed: {exc} — defaulting")
        return {"company_name": "Uploaded Image", "category": "Other", "confidence": 0.0, "rationale": "identification failed"}
