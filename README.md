# okDriver Sentinel

okDriver Sentinel is a centralized CCTV monitoring and real-time alert platform built for the okDriver Full Stack hiring assignment. The system maintains a camera registry, ingest detection events (for example ANPR / vehicle plates), matches them against a watchlist, and opens operator-facing alerts that can be acknowledged and resolved. A FastAPI backend owns persistence, matching, and WebSocket broadcast; a Next.js frontend provides an operational dashboard, GIS camera map, and alert workflow for control-room operators.

Role Applied For

Full Stack Developer

Tech Stack
Backend: FastAPI, SQLAlchemy, MySQL, JWT Auth, WebSocket
Frontend: Next.js 14, TypeScript, Tailwind CSS, Leaflet, hls.js
Real-time: FastAPI WebSocket (Redis-ready design)
Maps: Leaflet / OpenStreetMap
Video: HLS stream playback with adapter-ready architecture
API Docs: OpenAPI / Swagger at /docs
Deployment: Docker Compose (MySQL + Redis)
Features Implemented
Camera registry (CRUD, search, filters, status, audit-ready model)
Interactive GIS map with camera markers
Live / demo HLS video feeds per camera
Watchlist management
Detection event ingestion (ANPR-style)
Automatic watchlist matching with deduplication
Alert lifecycle: open → acknowledged → resolved
Operational dashboard (stats, live feeds, recent alerts)
Vehicle movement tracking across cameras
Role-based JWT authentication (admin / operator)
Dark operations-console UI
How to Run Locally
Backend
cd backend
python -m venv venv

Windows:

venv\Scripts\activate

Then install dependencies:

pip install -r requirements.txt

Start the backend:

uvicorn app.main:app --reload
Frontend

Open a new terminal:

cd frontend
npm install
npm run dev
Local URLs
Frontend: http://localhost:3000
API / Swagger: http://127.0.0.1:8000/docs
Demo Credentials
Email: admin@okdriver.com
Password: admin123

Change the password after first login in any shared environment. Do not commit real secrets.

Architecture Overview
High-Level System Flow
flowchart LR
    A[Cameras / AI Edge] -->|Detection Event| B[FastAPI Events API]
    B --> C[MySQL]
    B --> D[Matching Service]
    D -->|Watchlist Hit| E[Alert Created]
    E --> F[WebSocket Broadcast]
    F --> G[Dashboard / Alerts UI]
    H[Operators] --> G
    H --> I[Cameras Map]
    H --> J[Vehicle Tracking]
Alert Matching Flow
flowchart TD
    A[Detection Event] --> B[Vehicle Number]
    B --> C[Watchlist Matching]
    C --> D{Match Found?}
    D -->|No| E[Store Event]
    D -->|Yes| F[Deduplication Check]
    F --> G[Create Alert]
    G --> H[WebSocket Broadcast]
    H --> I[Operator Dashboard]
    I --> J[Acknowledge]
    J --> K[Resolve]
System Flow
Cameras and AI/analytics services generate vehicle detection events.
Detection events are sent to the FastAPI Events API.
Camera, event, watchlist, and alert data are stored in MySQL.
The matching service compares detected vehicle numbers with the active watchlist.
Matching events are checked for deduplication.
A new alert is created when a watchlist match is detected.
The alert is broadcast to connected operators using WebSocket.
Operators monitor alerts, cameras, maps, live feeds, and vehicle movement from the dashboard.
Scalability Notes
Stateless FastAPI services can horizontally scale behind a load balancer.
WebSocket communication can move to Redis Pub/Sub for multi-instance deployments.
Index frequently queried fields such as vehicle_number, camera_id, status, and created_at.
Edge / regional processing can pre-filter detection events before sending them to the central API.
HLS/WebRTC relay can be used for bandwidth control.
Older footage can be moved to cold storage.
Security
Bcrypt password hashing
JWT access tokens
Role-based route protection
CORS configured for the frontend origin
No production secrets stored in the repository
.env.example used for environment configuration
Limitations & Future Work
Demo uses public HLS sample streams instead of real RTSP streams.
RTSP/ONVIF integration follows an adapter-ready architecture for production.
WebSocket currently uses in-memory communication and can be replaced with Redis for multi-server deployments.
Vehicle tracking requires 2+ geo-tagged events for path visualization.
With More Time
ONVIF camera discovery
RTSP/ONVIF media relay
Redis Pub/Sub for multi-instance WebSockets
Kafka event bus for high-volume event processing
GPU-based edge workers
Edge preprocessing
Full high-availability deployment
Project Structure
okdriver-sentinel/
├── backend/              # FastAPI application
├── frontend/             # Next.js application
├── docker-compose.yml    # MySQL + Redis services
└── README.md             # Project documentation
Author

Ruchita Joshi

GitHub: https://github.com/ruchitajoshi0809-rgb/okdriver-sentinel