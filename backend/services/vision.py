"""
Heuristic evaluation vision service (GPT-4o Vision, OpenAI only).

Given a screenshot of a main page on a given device, scores the page against
the fixed 4.1-4.8 heuristic categories (HEURISTIC_CATEGORIES in models.py) and
produces per-category findings (observation + recommendation + severity), in
the exact category vocabulary the website_OC frontend's sidebar already
filters on. This is the core of spec step 4's "heuristic evaluation across
desktop/mobile/tablet."
"""

import base64
import json
import re
from io import BytesIO
from PIL import Image
from openai import AsyncOpenAI
from config import settings
from models import HEURISTIC_CATEGORIES, CategoryScore, Finding, VisualQuality

VISUAL_QUALITY_FIELDS = ["text_readability", "focus", "spacing", "image_clarity", "accessibility", "contrast"]


def _clean_json(raw: str) -> str:
    raw = (raw or "").strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _encode_image(image_bytes: bytes) -> str:
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    if img.width > 1280:
        ratio = 1280 / img.width
        img = img.resize((1280, int(img.height * ratio)), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


SYSTEM_PROMPT = f"""You are an expert UX heuristic evaluator. Analyze the provided website
screenshot (captured on a specific device viewport) and score it against these
fixed heuristic categories:

{chr(10).join(f"- {c}" for c in HEURISTIC_CATEGORIES)}

For EACH category, give a 0-100 score and 1-3 short findings (only if relevant —
skip a category's findings list if nothing notable applies, but still give it a
score). Also produce a flat list of the most important findings overall with a
severity and a concrete recommendation each.

Also score these 6 visual-quality sub-metrics directly from the screenshot's pixels
(0-100, higher is better — these are independent of the heuristic categories above):
- text_readability: font size/contrast/line-length legibility of body text
- focus: how clearly a single primary element/action draws the eye (visual hierarchy)
- spacing: whitespace and breathing room between elements (not cramped, not sparse)
- image_clarity: sharpness/quality/relevance of images and graphics used
- accessibility: color contrast, alt-text-friendly imagery, tap-target sizing cues
- contrast: color/tonal contrast between foreground content and background

Return ONLY this JSON shape:
{{
  "category_scores": [
    {{"category": "Home Page Effectiveness", "score": 78, "findings": ["..."]}}
  ],
  "findings": [
    {{"category": "Search", "severity": "Medium", "principle": "Visibility of System Status",
      "observation": "...", "recommendation": "..."}}
  ],
  "visual_quality": {{
    "text_readability": 90, "focus": 100, "spacing": 11,
    "image_clarity": 9, "accessibility": 100, "contrast": 11
  }},
  "overall_score": 78
}}

Rules:
- category MUST exactly match one of the fixed category names above.
- severity: High | Medium | Low
- Include 4-10 findings total across categories.
- visual_quality values must each be an integer 0-100, judged independently — do not
  just copy overall_score or category averages into them.
- Return ONLY raw JSON. No markdown, no extra text.
"""


async def evaluate(image_bytes: bytes, device: str) -> dict:
    """Run GPT-4o Vision heuristic evaluation. Returns a dict matching DeviceEvaluation fields."""
    # Explicit timeout + retries: under Railway's tighter network conditions a
    # connection attempt can transiently fail (surfaces as APIConnectionError,
    # "Connection error."); retrying a couple of times before giving up avoids
    # turning a one-off network blip into a failed evaluation.
    client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=60.0, max_retries=3)
    encoded = _encode_image(image_bytes)

    response = await client.chat.completions.create(
        model="gpt-4o",
        max_tokens=2200,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}", "detail": "high"}},
                {"type": "text", "text": f"This screenshot was captured on a {device} viewport. Evaluate it."},
            ]},
        ],
    )

    raw = response.choices[0].message.content or ""
    try:
        data = json.loads(_clean_json(raw))
    except json.JSONDecodeError as exc:
        raise ValueError(f"GPT-4o returned invalid JSON: {exc}\nRaw: {raw[:400]}") from exc

    category_scores = []
    for c in data.get("category_scores", []) if isinstance(data.get("category_scores"), list) else []:
        if not isinstance(c, dict) or c.get("category") not in HEURISTIC_CATEGORIES:
            continue
        try:
            score = max(0, min(100, int(c.get("score", 50))))
        except (TypeError, ValueError):
            score = 50
        category_scores.append(CategoryScore(
            category=c["category"],
            score=score,
            findings=[str(f) for f in c.get("findings", [])][:3] if isinstance(c.get("findings"), list) else [],
        ))

    # Ensure every category has a score (fill gaps with the overall average)
    seen = {c.category for c in category_scores}
    overall_fallback = int(data.get("overall_score", 60) or 60)
    for cat in HEURISTIC_CATEGORIES:
        if cat not in seen:
            category_scores.append(CategoryScore(category=cat, score=overall_fallback, findings=[]))

    findings = []
    for f in data.get("findings", []) if isinstance(data.get("findings"), list) else []:
        if not isinstance(f, dict) or not f.get("observation"):
            continue
        severity = f.get("severity", "Medium")
        if severity not in ("Low", "Medium", "High"):
            severity = "Medium"
        findings.append(Finding(
            category=str(f.get("category", "Page Layout & Visual Design")),
            severity=severity,
            principle=str(f.get("principle", "")),
            observation=str(f.get("observation", "")),
            recommendation=str(f.get("recommendation", "")),
        ))

    try:
        overall_score = max(0, min(100, int(data.get("overall_score", 0) or 0)))
    except (TypeError, ValueError):
        overall_score = 0
    if overall_score == 0 and category_scores:
        overall_score = round(sum(c.score for c in category_scores) / len(category_scores))

    vq_raw = data.get("visual_quality") if isinstance(data.get("visual_quality"), dict) else {}
    vq_kwargs = {}
    for field in VISUAL_QUALITY_FIELDS:
        try:
            vq_kwargs[field] = max(0, min(100, int(vq_raw.get(field, overall_score) or overall_score)))
        except (TypeError, ValueError):
            vq_kwargs[field] = overall_score
    visual_quality = VisualQuality(**vq_kwargs)

    return {
        "overall_score": overall_score,
        "category_scores": category_scores,
        "findings": findings,
        "visual_quality": visual_quality,
    }
