from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.event import DetectionEvent
from app.models.watchlist import Watchlist
from app.models.alert import Alert
from app.models.camera import Camera
from app.websocket.manager import manager
import asyncio

def check_and_create_alert(db: Session, event: DetectionEvent):
    """
    Check if the detected vehicle/person is in watchlist.
    If yes, create an alert.
    Also does basic deduplication (same plate + same camera within 2 minutes).
    """
    if not event.vehicle_number:
        return None

    # Find matching active watchlist item
    watchlist_item = db.query(Watchlist).filter(
        Watchlist.identifier == event.vehicle_number,
        Watchlist.is_active == True
    ).first()

    if not watchlist_item:
        return None

    # Deduplication: check if same alert was created recently
    two_minutes_ago = datetime.utcnow() - timedelta(minutes=2)
    existing_alert = db.query(Alert).filter(
        Alert.matched_identifier == event.vehicle_number,
        Alert.camera_id == event.camera_id,
        Alert.created_at >= two_minutes_ago
    ).first()

    if existing_alert:
        return None   # already alerted recently

    # Get camera location
    camera = db.query(Camera).filter(Camera.id == event.camera_id).first()

    # Create alert
    alert = Alert(
        detection_event_id=event.id,
        watchlist_id=watchlist_item.id,
        camera_id=event.camera_id,
        matched_identifier=event.vehicle_number,
        confidence=event.confidence,
        severity=watchlist_item.severity,
        status="open",
        location_lat=camera.latitude if camera else None,
        location_lng=camera.longitude if camera else None
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

    # Broadcast alert in real-time
    try:
        asyncio.create_task(manager.broadcast({
            "type": "new_alert",
            "data": {
                "id": alert.id,
                "matched_identifier": alert.matched_identifier,
                "severity": alert.severity,
                "camera_id": alert.camera_id,
                "confidence": alert.confidence,
                "status": alert.status,
                "created_at": str(alert.created_at)
            }
        }))
    except Exception:
        pass  # don't break if websocket fails

    return alert