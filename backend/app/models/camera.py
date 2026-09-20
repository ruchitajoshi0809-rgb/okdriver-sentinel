from sqlalchemy import Column, String, Boolean, DateTime, Float, Text
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_code = Column(String(50), unique=True, index=True, nullable=False)  # C001, C002
    name = Column(String(255), nullable=False)
    department = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    camera_type = Column(String(50), nullable=True)          # traffic, rto, junction etc.
    source_protocol = Column(String(50), default="hls")      # hls, rtsp, webrtc
    stream_url = Column(Text, nullable=True)
    status = Column(String(20), default="offline")           # online, offline, degraded
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    zone = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())