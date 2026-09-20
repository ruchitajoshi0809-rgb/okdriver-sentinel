from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String(50), nullable=False)      # vehicle / person
    identifier = Column(String(100), nullable=False, index=True)  # plate number or ID
    reason = Column(String(100), nullable=True)           # stolen, blacklisted, wanted...
    severity = Column(String(20), default="medium")       # high, medium, low
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())