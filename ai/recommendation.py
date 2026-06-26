"""AI recommendation layer — OpenRouter with deterministic fallback."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any

from ai.fallback import build_fallback_recommendation, fallback_recommendation
from ai.prompt import (
    DEFAULT_OPENROUTER_MODEL,
    SYSTEM_PROMPT,
    build_user_prompt,
    parse_recommendation_json,
    to_evidence_payload,
    validate_and_enforce_output,
)

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"


def _resolve_model() -> str:
    return os.environ.get("OPENROUTER_MODEL", "").strip() or DEFAULT_OPENROUTER_MODEL


def _call_openrouter(district: dict[str, Any], api_key: str, model: str) -> dict[str, str]:
    body = json.dumps(
        {
            "model": model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(district)},
            ],
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        OPENROUTER_CHAT_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/abu-dhabi-ai-proptech-challenge",
            "X-Title": "Community Gap Copilot",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.loads(response.read().decode("utf-8"))

    if data.get("error", {}).get("message"):
        raise RuntimeError(f"OpenRouter error: {data['error']['message']}")

    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not content:
        raise RuntimeError("OpenRouter returned an empty response")

    return parse_recommendation_json(content)


def generate_recommendation(
    district_object: dict[str, Any],
    *,
    force_fallback: bool = False,
    api_key: str | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Return structured recommendation for one district object.

    Uses OpenRouter when OPENROUTER_API_KEY is set; otherwise deterministic fallback.
  """
    evidence = to_evidence_payload(district_object)
    key = (api_key or os.environ.get("OPENROUTER_API_KEY", "")).strip()
    resolved_model = model or _resolve_model()

    if not force_fallback and key:
        try:
            raw = _call_openrouter(district_object, key, resolved_model)
            recommendation = validate_and_enforce_output(raw, district_object)
            return {
                "recommendation": recommendation,
                "source": "llm",
                "district": district_object["district"],
            }
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError, RuntimeError):
            pass

    return {
        "recommendation": fallback_recommendation(district_object),
        "source": "fallback",
        "district": district_object["district"],
    }
