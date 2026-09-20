from sqlalchemy import Column, String, Float, DateTime, Text
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    detection_event_id = Column(String(36), nullable=False)
    watchlist_id = Column(String(36), nullable=False)
    camera_id = Column(String(36), nullable=False)
    matched_identifier = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=True)
    severity = Column(String(20), default="medium")
    status = Column(String(20), default="open")          # open, acknowledged, resolved
    acknowledged_by = Column(String(36), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())