# ProductHealth Dashboard

A modular, three-tier dashboard for analyzing overnight robot stop reports. Upload `.ods` spreadsheets from automated test runs and get interactive visualizations of stop counts, durations, stop type distributions, spatial heatmaps, patch context, and multi-session trend tracking across software releases.

---

## What It Does

After each overnight test run, robots produce stop reports in `.ods` format. This dashboard lets you:

- **Upload** one or more stop report files for a test session
- **Attach patch spreadsheets** (`.csv`, `.ods`, `.xlsx`) that describe patch project, patch set, and description
- **Jump to Gerrit quickly** from each session patch row using the patch set hyperlink
- **See at a glance** how many stops occurred, which robots stopped most, and how long they were halted
- **Drill down** by stop type (L1/L2/L3 classification hierarchy), location, robot, or time
- **Compare across nights** — spot if a stop type is climbing day-over-day or after a software update
- **Switch modes** — Overview, Trends, Heatmap, and Compare modes via tab navigation

### Stop Report File Format

Files follow the naming convention:
```
{server}_{startTime}_{endTime}_stops.ods
```
Example: `b023_2026_03_10T17_42_2026_03_10T19_46_stops.ods`

The server name, test start time, and test end time are extracted automatically from the filename.

---

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Dashboard   │◄────►│   API Server  │◄────►│  PostgreSQL   │
│  React + Vite │ :5173│  Express + TS │ :3000│    16-alpine  │ :5432
│  TailwindCSS  │      │  Drizzle ORM  │      │ product_health│
└──────────────┘      └──────────────┘      └──────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS v4 + Zustand + Recharts + TanStack React Query |
| API | Node.js + Express 5 + TypeScript + Multer + Zod |
| Database | PostgreSQL 16 + Drizzle ORM |
| Shared types | `@ph/shared` — monorepo package consumed by both frontend and API |
| Containerization | Docker + Docker Compose (3 services) |
| ODS Parsing | SheetJS (xlsx) — server-side |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac) or Docker Engine + docker-compose-plugin (Ubuntu 18.04+)
- No Node.js installation required — everything runs inside Docker

---

## Running Locally

```bash
git clone <repo-url>
cd ProductHealth_Dashboard

docker compose up --build
# Dashboard: http://localhost:5173
# API:       http://localhost:3000/api/v1/health
# Database:  localhost:5432 (user: ph_user, db: product_health)
```

The database schema is automatically migrated on API startup. Edits to files in `dashboard/src/` are reflected instantly in the browser (Vite HMR).

### Stop

```bash
docker compose down
```

To also remove the database volume:
```bash
docker compose down -v
```

---

## How to Use

1. **Start Docker** — `docker compose up --build`
2. **Upload a stop report** — drag-and-drop or click the upload zone to select `.ods` files
3. **Add session metadata** — Release version is required to track software baselines
4. **Attach a patch spreadsheet** (optional) — include rows with `Project`, `Patch set`, and `Description`
5. **Click "Upload & Parse"** — file is uploaded to the API, parsed server-side, and stored in PostgreSQL
6. **Analyze Data** — Browse KPIs, view Patches, and filter through the Stop Records table
7. **Switch modes** — Use the tab bar to switch between Overview, Trends, Heatmap, and Compare
8. **Switch sessions** — Use the session dropdown in the header

---

## Project Structure

```
ProductHealth_Dashboard/
├── shared/                         # @ph/shared — shared TypeScript types + validation
│   └── src/
│       ├── types.ts                # Domain types (StopRecord, TestSession, KPIData, etc.)
│       ├── validation.ts           # Zod schemas for API request validation
│       └── constants.ts            # Default modes, API prefix
├── api/                            # Express API server
│   ├── src/
│   │   ├── index.ts                # Express app entry
│   │   ├── db/                     # Drizzle ORM schema + migrations
│   │   ├── routes/                 # REST endpoints (sessions, stops, aggregations, modes)
│   │   ├── services/               # Business logic (parser, session, aggregation)
│   │   ├── middleware/             # Error handling, Zod validation
│   │   └── plugins/               # Dashboard mode plugins (extensible)
│   └── Dockerfile
├── dashboard/                      # React 19 frontend
│   ├── src/
│   │   ├── api/                    # API client functions
│   │   ├── hooks/                  # React Query hooks
│   │   ├── modes/                  # Dashboard mode components (lazy-loaded)
│   │   │   ├── registry.ts         # Mode registry
│   │   │   ├── ModeRouter.tsx      # Renders active mode
│   │   │   ├── overview/           # Session overview (KPIs + table)
│   │   │   ├── trend/              # Multi-session trends
│   │   │   ├── heatmap/            # Spatial visualization
│   │   │   └── comparison/         # Side-by-side comparison
│   │   ├── components/             # Shared UI components
│   │   ├── store/                  # Zustand (UI state only)
│   │   └── lib/                    # Type re-exports
│   └── Dockerfile
├── docker-compose.yml              # Orchestrates db + api + dashboard
├── .env.example                    # Environment variable template
├── PLAN.md                         # Implementation roadmap
├── CLAUDE.md                       # AI assistant conventions
└── LICENSE
```

---

## Adding a New Dashboard Mode

The plugin/mode system makes it easy to add new features:

1. **Backend**: Create `api/src/plugins/mymode.plugin.ts` implementing `DashboardModePlugin`
2. **Frontend**: Create `dashboard/src/modes/mymode/MyMode.tsx` with a default export component
3. **Register**: Add entries to `api/src/plugins/registry.ts` and `dashboard/src/modes/registry.ts`
4. **Done** — no changes to core routing, database schema, or existing modes

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/sessions/upload` | Upload .ods + metadata |
| GET | `/api/v1/sessions` | List all sessions |
| GET | `/api/v1/sessions/:id` | Get session with stops |
| DELETE | `/api/v1/sessions/:id` | Delete session |
| GET | `/api/v1/sessions/:id/stops` | Filtered/sorted/paginated stops |
| GET | `/api/v1/sessions/:id/filter-options` | Unique values for filter dropdowns |
| GET | `/api/v1/sessions/:id/kpis` | KPI aggregations |
| GET | `/api/v1/sessions/:id/stops-by-robot` | Stop counts per robot |
| GET | `/api/v1/sessions/:id/reason-distribution` | Stop reason distribution |
| GET | `/api/v1/sessions/:id/heatmap` | Pose X/Y data for spatial viz |
| GET | `/api/v1/sessions/:id/patches` | Patch records |
| GET | `/api/v1/modes` | List dashboard modes |
| PUT | `/api/v1/modes/:id` | Update mode config |

---

## License

MIT
