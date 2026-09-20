from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class DetectionEventCreate(BaseModel):
    camera_id: str
    event_type: str
    vehicle_number: Optional[str] = None
    confidence: Optional[float] = None
    vehicle_type: Optional[str] = None
    bounding_box: Optional[Any] = None
    timestamp: datetime
    raw_payload: Optional[Any] = None

class DetectionEventOut(DetectionEventCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True