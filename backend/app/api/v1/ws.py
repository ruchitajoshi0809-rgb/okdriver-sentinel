from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Optional: handle client messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)