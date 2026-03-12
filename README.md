# ProductHealth Dashboard

A React-based dashboard for analyzing overnight robot stop reports. Upload `.ods` spreadsheets from automated test runs and get interactive visualizations of stop counts, durations, stop type distributions, spatial heatmaps, patch context, and multi-session trend tracking across software releases.

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
- Docker Engine + docker-compose-plugin — Ubuntu 18.04+

No Node.js installation required on your machine. Everything runs inside Docker.

---

## Running Locally (Development)

```bash
# Clone the repo
git clone <repo-url>
cd ProductHealth_Dashboard

# Start the dev server with hot reload
docker compose up --build
```

Open **http://localhost:5173** in your browser.

Edits to files under `dashboard/src/` are reflected instantly — no container restart needed.

### Stop the server

```bash
docker compose down
```

---

## Production Build

```bash
docker build --target prod -t ph-dashboard ./dashboard
docker run -p 8080:80 ph-dashboard
# Open http://localhost:8080
```

---

## How to Use

1. **Start the dev server** (see above)
2. **Upload a stop report** — drag-and-drop or click the upload zone to select one or more `.ods` files
3. **Add session metadata** (optional) — enter the release version and robot IDs; if robot IDs are left blank they are auto-detected from the data
4. **Attach a patch spreadsheet** (optional) — include rows with `Project`, `Patch set`, and `Description`; unrelated rows are ignored
5. **Click "Upload & Parse"** — files are parsed entirely in the browser (nothing is sent to a server)
6. **View patches for a session** — expand the "Patches in this test session" dropdown above KPI cards and click any patch set to open its Gerrit change in a new tab
7. **View KPIs** — six summary cards appear: total stops, total stop time, average duration, stops per robot, robot with most stops, and most common L2 stop reason
8. **Browse the stop table** — all stop records are listed with sortable columns (click a header to sort) and dropdown filters for Robot, L1/L2/L3 reason, and Location
9. **Switch sessions** — use the session dropdown in the header to switch between uploaded sessions, or click "Remove" to delete one

---

## Project Structure

```
ProductHealth_Dashboard/
├── dashboard/                      # Vite + React 19 + TypeScript app
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/          # KPI summary cards
│   │   │   ├── layout/            # Header with session selector
│   │   │   ├── tables/            # Sortable/filterable stop record table
│   │   │   └── upload/            # File upload + session metadata form
│   │   ├── lib/
│   │   │   ├── types.ts           # TypeScript interfaces (StopRecord, TestSession, etc.)
│   │   │   └── parser.ts          # ODS file parsing + filename metadata extraction
│   │   ├── store/
│   │   │   └── useStore.ts        # Zustand store (sessions, filters, sort state)
│   │   ├── App.tsx                # Main layout
│   │   └── main.tsx               # React entry point
│   └── Dockerfile                 # Multi-stage: dev (hot reload) + prod (nginx)
├── docker-compose.yml             # Orchestrates services
├── PLAN.md                        # Phased implementation roadmap
└── CLAUDE.md                      # AI assistant guidance
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| ODS parsing | SheetJS (xlsx) — fully client-side |
| State | Zustand |
| Container | Docker + docker-compose |
| Prod server | nginx |

---

## Current Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | File upload, ODS parsing, optional patch spreadsheet parsing, session patch dropdown, summary table, KPIs | Complete |
| Phase 2 | Interactive charts and cross-filtering | Planned |
| Phase 3 | Spatial heatmap (POSE_X / POSE_Y) | Planned |
| Phase 4 | Multi-session comparison and trend tracking | Planned |
| Phase 5 | Export, report generation, deployment | Planned |

See [PLAN.md](PLAN.md) for full details.

---

## License

MIT
