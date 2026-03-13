# ProductHealth Dashboard

A React-based dashboard for analyzing overnight robot stop reports. Upload `.ods` spreadsheets from automated test runs and get interactive visualizations of stop counts, durations, stop type distributions, spatial heatmaps, patch context, and multi-session trend tracking across software releases.

**⚠️ DISCLAIMER & WARNING ⚠️**
> This application uses a local PostgreSQL database inside Docker. If you delete the Docker volume `pg_data` or uninstall Docker, you will lose all uploaded test session data. Do not use this local setup as the sole repository of critical data without setting up database backups.

---

## What It Does

After each overnight test run, robots produce stop reports in `.ods` format. This dashboard lets you:

- **Upload** one or more stop report files for a test session
- **Attach patch spreadsheets** (`.csv`, `.ods`, `.xlsx`) that describe patch project, patch set, and description
- **Jump to Gerrit quickly** from each session patch row using the patch set hyperlink
- **See at a glance** how many stops occurred, which robots stopped most, and how long they were halted
- **Drill down** by stop type (L1/L2/L3 classification hierarchy), location, robot, or time
- **Compare across nights** — spot if a stop type is climbing day-over-day or after a software update
- **View stop hotspots** on a 2D floor map using robot coordinates (POSE_X / POSE_Y)

### Stop Report File Format

Files follow the naming convention:
```
{server}_{startTime}_{endTime}_stops.ods
```
Example: `b023_2026_03_10T17_42_2026_03_10T19_46_stops.ods`

The server name, test start time, and test end time are extracted automatically from the filename.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — Mac (Intel or Apple Silicon)
- Docker Engine + docker-compose-plugin — Ubuntu 18.04 LTS+

No Python or Node.js installation is required on your machine. Everything runs securely inside Docker.

---

## Running Locally

To start the full stack (Frontend, FastAPI Backend, and PostgreSQL Database):

```bash
# Clone the repo
git clone <repo-url>
cd ProductHealth_Dashboard

# Start all services and view URLs
./start-dev.sh
```

- **Frontend UI:** Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI).

### Stop the server

```bash
./stop.sh
```
*(Note: Stopping the server does not delete your data. It is safely stored in a docker volume `pg_data`)*

---

## How to Use

1. **Start the docker server** (see above).
2. **Upload a stop report** — drag-and-drop or click the upload zone to select one or more `.ods` files in the UI.
3. **Add session metadata** — Release version is highly recommended to track software baselines.
4. **Attach a patch spreadsheet** (optional) — include rows with `Project`, `Patch set`, and `Description`.
5. **Click "Upload & Parse"** — Data is parsed by the backend and saved persistently to the PostgreSQL database.
6. **Analyze Data** — Browse KPIs, view Patches, and filter through the Stop Records table.
7. **Switch sessions** — Use the session dropdown in the header to switch between uploaded historical sessions.

---

## Project Structure & Architecture

```
ProductHealth_Dashboard/
├── dashboard/                      # Vite + React 19 Frontend
│   ├── src/                        # Components, hooks, Zustand store connecting to API
│   └── Dockerfile                  # Exposes frontend on port 5173
├── api/                            # FastAPI (Python) Backend
│   ├── main.py                     # API Routes (GET/POST/DELETE)
│   ├── models.py                   # SQLAlchemy Postgres Schemas
│   ├── schemas.py                  # Pydantic validation schemas
│   └── Dockerfile                  # Exposes API on port 8000
├── docker-compose.yml             # Orchestrates ui, api, and db
└── README.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + TypeScript (Vite, TailwindCSS, Zustand) |
| **Backend API** | Python + FastAPI |
| **Database** | PostgreSQL 16 (SQLAlchemy ORM) |
| **Containerization** | Docker + Docker Compose |

## License

MIT
