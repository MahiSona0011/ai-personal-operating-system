import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

DAILY_REQUIRED = {"summary", "top_insight", "action_items", "patterns", "system_adjustment"}
WEEKLY_REQUIRED = {"narrative", "highlights", "improvement_areas", "next_week_focus", "score_analysis"}
ON_DEMAND_REQUIRED = {"answer", "supporting_data", "action_items"}
SENTIMENTS = {"positive", "neutral", "negative", "mixed"}
MAX_THEMES = 5


def _extract_json(text: str) -> dict:
    """Strip markdown fences if present, then parse a JSON object. Anything else raises."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("AI response is not a JSON object")
    return data


def parse_daily(raw: str) -> dict[str, Any]:
    data = _extract_json(raw)
    missing = DAILY_REQUIRED - data.keys()
    if missing:
        logger.warning("Daily analysis missing fields: %s", missing)
        for key in missing:
            data[key] = None
    # Clamp action item priorities
    for item in data.get("action_items") or []:
        item["priority"] = max(1, min(3, int(item.get("priority", 2))))
    return data


def parse_weekly(raw: str) -> dict[str, Any]:
    data = _extract_json(raw)
    missing = WEEKLY_REQUIRED - data.keys()
    if missing:
        logger.warning("Weekly review missing fields: %s", missing)
        for key in missing:
            data[key] = None
    return data


def parse_on_demand(raw: str) -> dict[str, Any]:
    data = _extract_json(raw)
    missing = ON_DEMAND_REQUIRED - data.keys()
    if missing:
        logger.warning("On-demand response missing fields: %s", missing)
        for key in missing:
            data[key] = None
    return data


def parse_journal(raw: str) -> dict[str, Any]:
    """A journal analysis needs a usable summary; themes and sentiment are cleaned up rather than trusted."""
    data = _extract_json(raw)
    summary = data.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        raise ValueError("Journal analysis has no summary")
    themes = data.get("themes")
    themes = [t.strip().lower()[:60] for t in themes if isinstance(t, str) and t.strip()] if isinstance(themes, list) else []
    sentiment = data.get("sentiment")
    sentiment = sentiment.strip().lower() if isinstance(sentiment, str) else None
    return {
        "summary": summary.strip(),
        "themes": themes[:MAX_THEMES],
        "sentiment": sentiment if sentiment in SENTIMENTS else None,
    }
