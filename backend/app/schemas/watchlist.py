from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WatchlistBase(BaseModel):
    entity_type: str
    identifier: str
    reason: Optional[str] = None
    severity: Optional[str] = "medium"
    description: Optional[str] = None

class WatchlistCreate(WatchlistBase):
    pass

class WatchlistUpdate(BaseModel):
    reason: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class WatchlistOut(WatchlistBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True