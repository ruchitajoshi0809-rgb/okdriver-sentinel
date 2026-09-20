from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.user import User
from app.models.alert import Alert
from app.schemas.alert import AlertOut, AlertStatusUpdate

router = APIRouter()

@router.get("/", response_model=List[AlertOut])
def list_alerts(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    
    alerts = query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()
    return alerts

@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.patch("/{alert_id}/status", response_model=AlertOut)
def update_alert_status(
    alert_id: str,
    status_in: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if status_in.status not in ["acknowledged", "resolved"]:
        raise HTTPException(status_code=400, detail="Status must be 'acknowledged' or 'resolved'")

    alert.status = status_in.status

    if status_in.status == "acknowledged":
        alert.acknowledged_by = current_user.id
        alert.acknowledged_at = datetime.utcnow()
    elif status_in.status == "resolved":
        alert.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(alert)
    return alert