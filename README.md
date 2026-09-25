# okDriver Sentinel

okDriver Sentinel is a centralized CCTV monitoring and real-time alert platform built for the okDriver Full Stack hiring assignment. The system maintains a camera registry, ingest detection events (for example ANPR / vehicle plates), matches them against a watchlist, and opens operator-facing alerts that can be acknowledged and resolved. A FastAPI backend owns persistence, matching, and WebSocket broadcast; a Next.js frontend provides an operational dashboard, GIS camera map, and alert workflow for control-room operators.

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Backend** | FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS, Axios |
| **Database** | MySQL via SQLAlchemy (`pymysql`). Docker Compose also includes PostgreSQL 16 for an alternative local setup. |
| **Real-time** | FastAPI WebSocket with an in-memory connection manager; Redis client is present for a future pub/sub path |
| **Maps** | Leaflet (`react-leaflet`) on the Cameras page |

## Features Implemented

- Camera Registry with CRUD, search, filters, audit logs
- Watchlist management
- Detection event ingestion
- Automatic matching engine with deduplication
- Alert lifecycle (open → acknowledged → resolved)
- WebSocket real-time alert broadcasting
- Operational Dashboard with live stats
- Cameras page with Leaflet GIS map
- Alerts management page

## Architecture Overview

**FastAPI modular structure.** The backend follows a layered layout: `api/v1` routers (auth, cameras, watchlist, events, alerts, WebSocket), SQLAlchemy `models`, Pydantic `schemas`, and domain `services` (matching). Shared concerns live in `core` (settings, database session, security) and `websocket` (connection manager). Tables are created on startup via SQLAlchemy metadata.

**Matching service flow.** A client posts a detection event. The events router persists it, then `check_and_create_alert` looks up an active watchlist identifier (vehicle number). If there is a match and no alert for the same plate and camera within two minutes (deduplication), an `open` alert is created with camera coordinates and watchlist severity. The intended next step is a WebSocket broadcast (`type: new_alert`) to all connected operator clients.

**Auth (JWT + role-based).** Login uses OAuth2 password form data and returns a JWT (`sub` = user email, HS256, 24-hour expiry). Protected routes depend on `get_current_active_user`. Mutating camera operations require `get_current_admin_user` (`role == "admin"`). Operators can list cameras, ingest events, and manage alert status.

**Frontend–backend separation.** The Next.js app talks only to HTTP APIs (`NEXT_PUBLIC_API_URL`, default expected `http://localhost:8000/api/v1`) with a Bearer token stored in a cookie. UI routes (`/login`, `/dashboard`, `/cameras`, `/alerts`) never share a process with FastAPI, so the API can scale independently of the web tier.

```
Detection Event  →  Watchlist check  →  Alert (open)  →  WebSocket broadcast
                         ↓
              Dedup: same plate + camera < 2 min
```

## How to Run Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL (current default `DATABASE_URL`) **or** PostgreSQL if you point `DATABASE_URL` at the Compose service
- Optional: Docker Desktop (PostgreSQL + Redis via `docker-compose.yml`)

### 1. Database

Create a database named `okdriver_sentinel`. Copy or edit `backend` settings so `DATABASE_URL` matches your local instance, for example:

```text
mysql+pymysql://USER:PASSWORD@localhost:3306/okdriver_sentinel
```

Optional infrastructure:

```bash
docker compose up -d
```

This starts PostgreSQL (`localhost:5432`) and Redis (`localhost:6379`). If you use Compose Postgres, set `DATABASE_URL` to a PostgreSQL SQLAlchemy URL instead of MySQL.

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API root: [http://localhost:8000](http://localhost:8000)

Register the first user (there is no seed script):

```http
POST http://localhost:8000/api/v1/auth/register
Content-Type: application/json

{
  "email": "admin@okdriver.com",
  "password": "admin123",
  "full_name": "Admin",
  "role": "admin"
}
```

### 3. Frontend

Create `frontend/.env.local`:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

```bash
cd frontend
npm install
npm run dev
```

UI: [http://localhost:3000](http://localhost:3000)

### Default login credentials

| Field | Value |
| --- | --- |
| Email | `admin@okdriver.com` |
| Password | `admin123` |

These values are pre-filled on the login page. Register that user once (with `role: "admin"`) before signing in.

## API Documentation

Interactive Swagger UI (FastAPI):

**[http://localhost:8000/docs](http://localhost:8000/docs)**

OpenAPI schema: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

WebSocket endpoint: `ws://localhost:8000/ws`

| Area | Base path |
| --- | --- |
| Auth | `/api/v1/auth` |
| Cameras | `/api/v1/cameras` |
| Watchlist | `/api/v1/watchlist` |
| Detection events | `/api/v1/events` |
| Alerts | `/api/v1/alerts` |

## Scalability Considerations

- **Stateless API design.** HTTP handlers are request-scoped (SQLAlchemy session per request, JWT validated per call). Any replica can serve REST traffic without sticky sessions.
- **Ready for Redis pub/sub instead of in-memory WebSocket.** `ConnectionManager` currently holds sockets in process memory. `app/core/redis.py` is already wired to `REDIS_URL`, so broadcasts can move to Redis pub/sub and each API instance can fan out to its local clients.
- **Horizontal scaling notes.** Run multiple Uvicorn/Gunicorn workers behind a load balancer for REST. Put the database on a managed instance, keep secrets in environment variables, and terminate TLS at the edge. WebSocket scaling requires a shared pub/sub bus (Redis) plus a balancer that supports WebSocket upgrades.
- **Database indexing on vehicle_number, camera_id, status.** Detection events already index `vehicle_number` and `camera_id` for match and list queries. Watchlist `identifier` and camera `camera_code` are indexed. Alert `status` and `camera_id` are natural next indexes for operator filters and GIS lookups as volume grows.
- **Future RTSP/WebRTC adapter pattern.** Cameras store `source_protocol` (`hls` default, plus `rtsp` / `webrtc`) and `stream_url`. Stream adapters can sit behind that contract without changing registry or matching logic.

## Security Notes

- **Password hashing (bcrypt).** Passwords are hashed with Passlib (`bcrypt`) and never stored in plaintext.
- **JWT tokens.** Access tokens are signed with HS256 (`python-jose`). The frontend sends `Authorization: Bearer <token>` on API calls.
- **Role-based access control.** Users have `admin` or `operator` roles. Camera create/update/delete is admin-only; other operational APIs require an active authenticated user.
- **CORS configuration.** FastAPI `CORSMiddleware` is enabled so the Next.js origin can call the API. Origins should be locked down in production rather than left as a wildcard.

Replace `SECRET_KEY` and database credentials before any non-local deployment.

## Limitations & Future Improvements

- Video streaming currently uses HLS placeholder URLs
- Redis not mandatory in current setup (in-memory WebSocket used)
- No edge AI processing yet
- Can be extended with Kafka / ONVIF

## Project Structure

```text
okdriver-sentinel/
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── api/
│       │   ├── deps.py
│       │   └── v1/
│       │       ├── auth.py
│       │       ├── cameras.py
│       │       ├── watchlist.py
│       │       ├── events.py
│       │       ├── alerts.py
│       │       └── ws.py
│       ├── core/
│       │   ├── config.py
│       │   ├── database.py
│       │   ├── security.py
│       │   └── redis.py
│       ├── models/
│       ├── schemas/
│       ├── services/
│       │   └── matching_service.py
│       └── websocket/
│           └── manager.py
├── frontend/
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── login/page.tsx
│       │   ├── dashboard/page.tsx
│       │   ├── cameras/page.tsx
│       │   └── alerts/page.tsx
│       ├── components/
│       │   └── CameraMap.tsx
│       └── lib/
│           └── api.ts
├── docker-compose.yml
└── README.md
```
