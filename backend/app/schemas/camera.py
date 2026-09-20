from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CameraBase(BaseModel):
    camera_code: str
    name: str
    department: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    camera_type: Optional[str] = None
    source_protocol: Optional[str] = "hls"
    stream_url: Optional[str] = None
    zone: Optional[str] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    camera_type: Optional[str] = None
    source_protocol: Optional[str] = None
    stream_url: Optional[str] = None
    zone: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

class CameraOut(CameraBase):
    id: str
    status: str
    last_heartbeat: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True