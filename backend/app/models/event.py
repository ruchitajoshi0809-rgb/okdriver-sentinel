from sqlalchemy import Column, String, Float, DateTime, Text, JSON
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_id = Column(String(36), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)       # anpr, vehicle_detection etc.
    vehicle_number = Column(String(50), nullable=True, index=True)
    confidence = Column(Float, nullable=True)
    vehicle_type = Column(String(50), nullable=True)
    bounding_box = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    raw_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())