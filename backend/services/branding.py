"""
Brand identity extraction (spec step 2): logo + primary/secondary colors.

Strategy:
  1. Ask GPT-4o Vision to look at the homepage screenshot and identify the logo
     region + the two dominant brand colors (it reasons about *brand* colors,
     not just "most pixels", which a naive color-quantization pass would get
     wrong on mostly-white pages).
  2. Crop the logo region out of the screenshot and upload it (so the frontend
     has an actual logo image, not just a description).
  3. Fall back to PIL color quantization for the palette if GPT's hex codes are
     missing/invalid, and skip the crop if GPT didn't find a confident box.
"""

import base64
import json
import re
from io import BytesIO
from PIL import Image
from openai import AsyncOpenAI
from config import settings
from models import BrandIdentity


def _clean_json(raw: str) -> str:
    raw = (raw or "").strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _hex_ok(value: str) -> bool:
    return bool(re.fullmatch(r"#[0-9a-fA-F]{6}", value or ""))


def _palette_from_pixels(img: Image.Image, n: int = 5) -> list[str]:
    """Fallback: PIL median-cut palette, returned as hex strings."""
    small = img.convert("RGB").resize((150, 150))
    quant = small.quantize(colors=n, method=Image.MEDIANCUT)
    palette = quant.getpalette()[: n * 3]
    colors = []
    for i in range(n):
        r, g, b = palette[i * 3: i * 3 + 3]
        colors.append(f"#{r:02x}{g:02x}{b:02x}")
    return colors


async def extract_branding(image_bytes: bytes, job_id: str = "job") -> BrandIdentity:
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    w, h = img.size

    encoded = base64.b64encode(image_bytes).decode("utf-8")
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    system = (
        "You are a brand-identity analyst. Look at this website screenshot and identify:\n"
        "1. The site logo's approximate bounding box (top-left header area, usually).\n"
        "2. The two dominant BRAND colors used in navigation/buttons/accents \u2014 not the "
        "page background if it's plain white/gray.\n\n"
        'Return ONLY JSON: {"logo_box": {"x":int,"y":int,"width":int,"height":int} or null, '
        '"logo_description": str, "primary_color": "#rrggbb", "secondary_color": "#rrggbb"}\n'
        f"Image is {w}px wide x {h}px tall \u2014 coordinates in pixels.\n"
        "Return ONLY valid JSON, no markdown."
    )

    try:
        res = await client.chat.completions.create(
            model="gpt-4o",
            max_tokens=400,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}", "detail": "high"}},
                    {"type": "text", "text": "Identify the logo box and brand colors."},
                ]},
            ],
        )
        data = json.loads(_clean_json(res.choices[0].message.content or "{}"))
    except Exception as exc:
        print(f"[branding] GPT extraction failed: {exc} \u2014 using palette fallback only")
        data = {}

    palette = _palette_from_pixels(img)
    primary = data.get("primary_color") if _hex_ok(data.get("primary_color", "")) else (palette[0] if palette else "#000000")
    secondary = data.get("secondary_color") if _hex_ok(data.get("secondary_color", "")) else (palette[1] if len(palette) > 1 else "#ffffff")

    logo_url = ""
    box = data.get("logo_box")
    if isinstance(box, dict) and all(k in box for k in ("x", "y", "width", "height")):
        try:
            x, y, bw, bh = int(box["x"]), int(box["y"]), int(box["width"]), int(box["height"])
            x = max(0, min(x, w - 1))
            y = max(0, min(y, h - 1))
            bw = max(10, min(bw, w - x))
            bh = max(10, min(bh, h - y))
            crop = img.crop((x, y, x + bw, y + bh))
            buf = BytesIO()
            crop.save(buf, format="PNG")
            from services.storage import upload_image
            logo_url = upload_image(buf.getvalue(), f"{job_id}_logo.png", folder="ux-intel-agent/logos")
        except Exception as exc:
            print(f"[branding] logo crop failed: {exc}")

    return BrandIdentity(
        logo_url=logo_url,
        logo_description=str(data.get("logo_description", "")),
        primary_color=primary,
        secondary_color=secondary,
        palette=palette,
    )
