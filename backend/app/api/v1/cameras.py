from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.core.database import get_db
from app.api.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.camera import Camera
from app.models.camera_audit import CameraAuditLog
from app.schemas.camera import CameraCreate, CameraUpdate, CameraOut

router = APIRouter()

@router.post("/", response_model=CameraOut)
def create_camera(
    camera_in: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # Check if camera_code already exists
    existing = db.query(Camera).filter(Camera.camera_code == camera_in.camera_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Camera code already exists")

    camera = Camera(**camera_in.model_dump())
    db.add(camera)
    db.commit()
    db.refresh(camera)

    # Audit log
    audit = CameraAuditLog(
        camera_id=camera.id,
        action="created",
        changed_by=current_user.id,
        new_values=json.dumps(camera_in.model_dump())
    )
    db.add(audit)
    db.commit()

    return camera

@router.get("/", response_model=List[CameraOut])
def list_cameras(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    zone: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Camera)

    if search:
        query = query.filter(
            (Camera.name.ilike(f"%{search}%")) |
            (Camera.camera_code.ilike(f"%{search}%"))
        )
    if status:
        query = query.filter(Camera.status == status)
    if department:
        query = query.filter(Camera.department == department)
    if zone:
        query = query.filter(Camera.zone == zone)
    if is_active is not None:
        query = query.filter(Camera.is_active == is_active)

    cameras = query.offset(skip).limit(limit).all()
    return cameras

@router.get("/{camera_id}", response_model=CameraOut)
def get_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@router.put("/{camera_id}", response_model=CameraOut)
def update_camera(
    camera_id: str,
    camera_in: CameraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    old_values = {
        "name": camera.name,
        "department": camera.department,
        "status": camera.status,
        "is_active": camera.is_active
    }

    update_data = camera_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(camera, field, value)

    db.commit()
    db.refresh(camera)

    # Audit log
    audit = CameraAuditLog(
        camera_id=camera.id,
        action="updated",
        changed_by=current_user.id,
        old_values=json.dumps(old_values),
        new_values=json.dumps(update_data)
    )
    db.add(audit)
    db.commit()

    return camera

@router.patch("/{camera_id}/disable", response_model=CameraOut)
def disable_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera.is_active = False
    camera.status = "offline"
    db.commit()
    db.refresh(camera)

    audit = CameraAuditLog(
        camera_id=camera.id,
        action="disabled",
        changed_by=current_user.id
    )
    db.add(audit)
    db.commit()

    return camera

@router.patch("/{camera_id}/enable", response_model=CameraOut)
def enable_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera.is_active = True
    db.commit()
    db.refresh(camera)

    audit = CameraAuditLog(
        camera_id=camera.id,
        action="enabled",
        changed_by=current_user.id
    )
    db.add(audit)
    db.commit()

    return camera