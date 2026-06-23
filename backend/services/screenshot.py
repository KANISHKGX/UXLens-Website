"""
Multi-device screenshot capture service.
Primary:  Selenium  (uses system Chrome — no extra downloads)
Fallback: Playwright -> thum.io

Unlike ../backend's single-viewport capture, this supports desktop/tablet/mobile
viewports so the heuristic evaluation can run per device (spec step 4).
"""

import re
import asyncio
import time
from io import BytesIO
from PIL import Image

from config import settings
from models import DEVICE_VIEWPORTS


def resolve_input_to_url(raw: str) -> tuple[str, str]:
    """
    Accepts either a full URL or a bare company name.
    Returns (base_url, company_slug).
    """
    raw = raw.strip()
    if raw.lower().startswith("http://") or raw.lower().startswith("https://"):
        from urllib.parse import urlparse
        parsed = urlparse(raw)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        company = (parsed.hostname or "unknown").replace("www.", "").split(".")[0]
        return base_url, company

    company = raw.lower()
    company = re.sub(r"\.(png|jpg|jpeg|gif|svg|webp)$", "", company)
    slug = re.sub(r"[^a-z0-9.-]", "", company.replace(" ", ""))
    if "." in slug:
        base_url = f"https://{slug}"
        company = slug.split(".")[0]
    else:
        base_url = f"https://{slug}.com"
        company = slug
    return base_url, company


def build_thumio_url(url: str, width: int = 1280) -> str:
    base = "https://image.thum.io/get"
    if settings.thumio_api_key:
        base = f"https://image.thum.io/get/auth/{settings.thumio_api_key}"
    return f"{base}/width/{width}/{url}"


# ── Selenium (primary) ─────────────────────────────────────────────────────────

def _capture_selenium_sync(url: str, width: int, height: int, mobile: bool) -> bytes:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options

    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument(f"--window-size={width},{height}")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    if mobile:
        opts.add_argument(
            f"user-agent=Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
            f"(KHTML, like Gecko) CriOS/124.0.0.0 Mobile Safari/537.36"
        )
    else:
        opts.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )

    driver = webdriver.Chrome(options=opts)
    try:
        driver.set_page_load_timeout(25)
        try:
            driver.get(url)
        except Exception:
            pass
        time.sleep(2.5)
        png_bytes = driver.get_screenshot_as_png()
    finally:
        driver.quit()

    img = Image.open(BytesIO(png_bytes)).convert("RGB")
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


async def _capture_with_selenium(url: str, width: int, height: int, mobile: bool) -> bytes:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _capture_selenium_sync, url, width, height, mobile)


# ── Playwright (secondary) ─────────────────────────────────────────────────────

async def _capture_with_playwright(url: str, width: int, height: int, mobile: bool) -> bytes:
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        context = await browser.new_context(
            viewport={"width": width, "height": height},
            is_mobile=mobile,
            has_touch=mobile,
            user_agent=(
                "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
                "(KHTML, like Gecko) CriOS/124.0.0.0 Mobile Safari/537.36"
                if mobile else
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            await asyncio.sleep(2)
        except Exception:
            pass
        screenshot = await page.screenshot(type="jpeg", quality=85)
        await browser.close()
        return screenshot


# ── thum.io (last resort — desktop-width only) ─────────────────────────────────

async def _capture_with_thumio(url: str, width: int) -> bytes:
    import httpx
    thumio_url = build_thumio_url(url, width=width)
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(thumio_url)
    if response.status_code != 200:
        raise RuntimeError(f"thum.io HTTP {response.status_code}")
    if "image" not in response.headers.get("content-type", ""):
        raise RuntimeError("thum.io returned non-image")
    return response.content


# ── Public API ─────────────────────────────────────────────────────────────────

async def capture_device(url: str, device: str) -> bytes:
    """Capture a screenshot of `url` at the viewport size for `device`."""
    width, height = DEVICE_VIEWPORTS.get(device, DEVICE_VIEWPORTS["desktop"])
    mobile = device == "mobile"

    e1 = e2 = e3 = None
    try:
        data = await _capture_with_selenium(url, width, height, mobile)
        print(f"[screenshot] Selenium OK  {url} ({device})")
        return data
    except Exception as err:
        e1 = err
        print(f"[screenshot] Selenium failed ({device}): {err}")

    try:
        data = await _capture_with_playwright(url, width, height, mobile)
        print(f"[screenshot] Playwright OK  {url} ({device})")
        return data
    except Exception as err:
        e2 = err
        print(f"[screenshot] Playwright failed ({device}): {err}")

    try:
        data = await _capture_with_thumio(url, width)
        print(f"[screenshot] thum.io OK  {url} ({device})")
        return data
    except Exception as err:
        e3 = err

    raise RuntimeError(
        f"All screenshot methods failed for {url} ({device}).\n"
        f"  Selenium:   {e1}\n"
        f"  Playwright: {e2}\n"
        f"  thum.io:    {e3}"
    )


def save_screenshot(image_bytes: bytes, filename: str) -> str:
    """Save screenshot to local disk. Returns the file path."""
    from services.storage import upload_image
    return upload_image(image_bytes, filename, folder="ux-intel-agent/screenshots")
