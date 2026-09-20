from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class CameraAuditLog(Base):
    __tablename__ = "camera_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_id = Column(String(36), nullable=False)
    action = Column(String(50), nullable=False)          # created, updated, disabled, enabled
    changed_by = Column(String(36), nullable=True)       # user id
    old_values = Column(Text, nullable=True)             # JSON string
    new_values = Column(Text, nullable=True)             # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())