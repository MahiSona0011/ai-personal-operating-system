from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, field_validator

VALID_MOODS = {"reflecting", "grateful", "anxious", "energized", "frustrated", "neutral", "focused"}
VALID_AREA_SLUGS = {"health", "mind", "relationships", "work", "money", "growth"}


class CreateJournalRequest(BaseModel):
    entry_date: date
    title: Optional[str] = None
    content: str
    life_area_tags: Optional[list[str]] = None
    mood_tag: Optional[str] = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Content cannot be empty")
        return v

    @field_validator("mood_tag")
    @classmethod
    def validate_mood(cls, v):
        if v is not None and v not in VALID_MOODS:
            raise ValueError(f"mood_tag must be one of: {', '.join(sorted(VALID_MOODS))}")
        return v

    @field_validator("life_area_tags")
    @classmethod
    def validate_area_tags(cls, v):
        if v is not None:
            invalid = [t for t in v if t not in VALID_AREA_SLUGS]
            if invalid:
                raise ValueError(f"Invalid area tags: {invalid}")
        return v


class UpdateJournalRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    life_area_tags: Optional[list[str]] = None
    mood_tag: Optional[str] = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Content cannot be empty")
        return v

    @field_validator("mood_tag")
    @classmethod
    def validate_mood(cls, v):
        if v is not None and v not in VALID_MOODS:
            raise ValueError(f"mood_tag must be one of: {', '.join(sorted(VALID_MOODS))}")
        return v

    @field_validator("life_area_tags")
    @classmethod
    def validate_area_tags(cls, v):
        if v is not None:
            invalid = [t for t in v if t not in VALID_AREA_SLUGS]
            if invalid:
                raise ValueError(f"Invalid area tags: {invalid}")
        return v


class JournalEntryResponse(BaseModel):
    id: int
    user_id: int
    entry_date: date
    title: Optional[str]
    content: str
    life_area_tags: Optional[list[str]]
    mood_tag: Optional[str]
    ai_summary: Optional[str]
    ai_themes: Optional[list[str]]
    ai_sentiment: Optional[str]
    ai_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
