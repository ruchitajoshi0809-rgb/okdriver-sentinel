from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.watchlist import Watchlist
from app.schemas.watchlist import WatchlistCreate, WatchlistUpdate, WatchlistOut

router = APIRouter()

@router.post("/", response_model=WatchlistOut)
def create_watchlist_item(
    item_in: WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    item = Watchlist(**item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/", response_model=List[WatchlistOut])
def list_watchlist(
    skip: int = 0,
    limit: int = 100,
    entity_type: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Watchlist)
    if entity_type:
        query = query.filter(Watchlist.entity_type == entity_type)
    if is_active is not None:
        query = query.filter(Watchlist.is_active == is_active)
    return query.offset(skip).limit(limit).all()

@router.get("/{item_id}", response_model=WatchlistOut)
def get_watchlist_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    item = db.query(Watchlist).filter(Watchlist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return item

@router.put("/{item_id}", response_model=WatchlistOut)
def update_watchlist_item(
    item_id: str,
    item_in: WatchlistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    item = db.query(Watchlist).filter(Watchlist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_watchlist_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    item = db.query(Watchlist).filter(Watchlist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    
    item.is_active = False
    db.commit()
    return {"message": "Watchlist item deactivated"}