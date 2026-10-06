from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, field_validator

VALID_AREA_IDS = {1, 2, 3, 4, 5, 6}


class CreateMetricRequest(BaseModel):
    life_area_id: int
    metric_key: str
    metric_date: date
    value_numeric: Optional[float] = None
    unit: Optional[str] = None

    @field_validator("life_area_id")
    @classmethod
    def validate_area(cls, v):
        if v not in VALID_AREA_IDS:
            raise ValueError(f"life_area_id must be one of: {sorted(VALID_AREA_IDS)}")
        return v

    @field_validator("metric_key")
    @classmethod
    def validate_key(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("metric_key cannot be empty")
        if len(v) > 100:
            raise ValueError("metric_key cannot exceed 100 characters")
        return v

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v):
        if v is not None and len(v) > 50:
            raise ValueError("unit cannot exceed 50 characters")
        return v


class UpdateMetricRequest(BaseModel):
    metric_date: Optional[date] = None
    value_numeric: Optional[float] = None
    unit: Optional[str] = None

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v):
        if v is not None and len(v) > 50:
            raise ValueError("unit cannot exceed 50 characters")
        return v


class MetricResponse(BaseModel):
    id: int
    user_id: int
    life_area_id: int
    metric_key: str
    metric_date: date
    value_numeric: Optional[float]
    unit: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
