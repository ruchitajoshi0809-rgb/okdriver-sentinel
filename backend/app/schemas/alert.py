from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertOut(BaseModel):
    id: str
    detection_event_id: str
    watchlist_id: str
    camera_id: str
    matched_identifier: str
    confidence: Optional[float] = None
    severity: str
    status: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str   # acknowledged or resolved