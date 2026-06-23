"""
Right-panel chat assistant (text-only, OpenAI, no vision).

Takes the currently-viewed observation/recommendation plus a free-text
instruction from the user (e.g. "make this shorter", "add a line about
mobile") and returns a revised observation/recommendation pair. This is what
makes the RightPanel prompt box actually do something instead of just
clearing itself on send.

Follows the same client/JSON-mode/cleanup pattern as services/vision.py.
"""

import json
import re

from openai import AsyncOpenAI
from config import settings


def _clean_json(raw: str) -> str:
    raw = (raw or "").strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


SYSTEM_PROMPT = """You are a UX writing assistant embedded in a heuristic-evaluation
report tool. You will be given the current "Observation" and "Recommendation"
text (each a short list of lines) for one finding, plus an instruction from
the reviewer. Apply the instruction and return the revised lines.

Keep the same general meaning unless the instruction asks to change it.
Keep each line concise (under ~25 words). Keep the list short (1-4 lines per
field) unless asked to expand.

Return ONLY this JSON shape:
{
  "observation": ["line 1", "line 2"],
  "recommendation": ["line 1", "line 2"],
  "reply": "one short sentence summarizing what you changed, to show in the chat"
}
"""


async def apply_edit(observation: list[str], recommendation: list[str], instruction: str) -> dict:
    """Run a text-only OpenAI completion to revise an observation/recommendation pair."""
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured.")

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    user_payload = {
        "observation": observation,
        "recommendation": recommendation,
        "instruction": instruction,
    }

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=600,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_payload)},
        ],
    )

    raw = response.choices[0].message.content or ""
    try:
        data = json.loads(_clean_json(raw))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Assistant returned invalid JSON: {exc}\nRaw: {raw[:400]}") from exc

    def _lines(value, fallback):
        if isinstance(value, list) and value:
            return [str(v) for v in value]
        return fallback

    return {
        "observation": _lines(data.get("observation"), observation),
        "recommendation": _lines(data.get("recommendation"), recommendation),
        "reply": str(data.get("reply", "Done.")),
    }
