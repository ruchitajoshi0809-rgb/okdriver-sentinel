from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import auth, cameras, watchlist, events, alerts
from app.models import user, camera, camera_audit, watchlist as watchlist_model, event, alert

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(cameras.router, prefix=f"{settings.API_V1_STR}/cameras", tags=["cameras"])
app.include_router(watchlist.router, prefix=f"{settings.API_V1_STR}/watchlist", tags=["watchlist"])
app.include_router(events.router, prefix=f"{settings.API_V1_STR}/events", tags=["events"])
app.include_router(alerts.router, prefix=f"{settings.API_V1_STR}/alerts", tags=["alerts"])

@app.get("/")
def root():
    return {"message": "okDriver Sentinel API is running"}