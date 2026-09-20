from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.event import DetectionEvent
from app.models.camera import Camera
from app.schemas.event import DetectionEventCreate, DetectionEventOut

router = APIRouter()

@router.post("/", response_model=DetectionEventOut)
def create_detection_event(
    event_in: DetectionEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Validate camera exists
    camera = db.query(Camera).filter(Camera.id == event_in.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    event = DetectionEvent(**event_in.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.get("/", response_model=List[DetectionEventOut])
def list_events(
    skip: int = 0,
    limit: int = 50,
    camera_id: str = None,
    vehicle_number: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(DetectionEvent)

    if camera_id:
        query = query.filter(DetectionEvent.camera_id == camera_id)
    if vehicle_number:
        query = query.filter(DetectionEvent.vehicle_number == vehicle_number)

    events = query.order_by(DetectionEvent.timestamp.desc()).offset(skip).limit(limit).all()
    return events