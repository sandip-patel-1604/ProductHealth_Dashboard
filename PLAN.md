# ProductHealth Dashboard — Phased Implementation Plan

## Goal

A React-based dashboard for daily analysis of overnight robot stop reports. Users upload `.ods` spreadsheets (one per test run), and the dashboard provides interactive visualizations to evaluate test health, identify problematic robots, track stop-type trends across days, and pinpoint stop hotspots.

---

## Data Model

### File Naming Convention
```
{server}_{startTime}_{endTime}_stops.ods
```
Example: `b023_2026_03_10T17_42_2026_03_10T19_46_stops.ods`

### Key Columns (per stop row)
| Column | Description |
|---|---|
| RobotId | Unique robot identifier (e.g., 220, 221, 310) |
| Logs timestamp EST | When the stop occurred |
| RobotId_timestamp | Video filename / resume timestamp |
| L1_STOP_REASON | Top-level stop classification (TRAVEL_STOP, ACTIVITY_STOP) |
| L2_STOP_REASON | Sub-classification (PATH_FOLLOWING_FAILED_STOP, NRV_STOP, etc.) |
| L3_STOP_REASON | Granular classification (WAITING_FOR_RZ, PATH_VERIFICATION_FAILED, etc.) |
| STOP_LOCATION_CODE | Named location where stop occurred |
| POSE_X, POSE_Y | Robot coordinates during stop |
| STOP_DURATION | Duration of the stop in seconds |

### User-Provided Metadata (per test session)
- Release version / software branch under test
- Robot IDs assigned to the test
- Server name
- Date of overnight run

---

## Phase 1 — Foundation & File Upload (MVP)

**Goal:** Get data into the browser, parse it, and show a basic summary table.

### Tasks
1. **Scaffold React app** (Vite + React + TypeScript)
2. **ODS file parser** — client-side parsing of `.ods` files using `xlsx` (SheetJS) library
   - Extract metadata from filename (server, start/end time)
   - Parse rows into structured stop records
3. **Test session form** — user inputs release version, robot IDs, and uploads one or more `.ods` files
4. **Data store** — React context or Zustand store to hold parsed sessions + stop records (persisted to localStorage/IndexedDB)
5. **Summary table view** — show all stops for a session with sortable/filterable columns
6. **Basic KPIs** — total stops, total stop duration, stops per robot, average stop duration

### Deliverables
- Working upload flow → parsed data → summary table
- Session metadata captured and stored

---

## Phase 2 — Interactive Charts & Distributions

**Goal:** Visualize stop distributions with interactive, filterable charts.

### Tasks
1. **Charting library** — integrate Recharts or Plotly.js
2. **Stop count by Robot** — bar chart showing how many stops each robot had
3. **Stop duration by Robot** — box plot or bar chart of total/avg stop duration per robot
4. **Stop type breakdown** — stacked bar or sunburst chart showing L1 → L2 → L3 hierarchy
5. **Timeline chart** — scatter/line plot of stops over time (x = timestamp, y = duration, color = robot or stop type)
6. **Location distribution** — bar chart of stops per STOP_LOCATION_CODE
7. **Filters panel** — global filters for robot, L1/L2/L3 type, location, duration range — all charts react to filters

### Deliverables
- 5+ interactive chart types
- Cross-filtering across all visualizations

---

## Phase 3 — Spatial Heatmap & Stop Hotspots

**Goal:** Plot stops on a 2D map using POSE_X/POSE_Y coordinates.

### Tasks
1. **2D scatter plot** — plot each stop at (POSE_X, POSE_Y), colored by L1 type or robot
2. **Heatmap overlay** — density heatmap to highlight stop hotspots
3. **Click-to-inspect** — click a point to see full stop details (robot, type, duration, timestamp)
4. **Optional floor plan background** — if a floor plan image is provided, overlay stops on it

### Deliverables
- Spatial visualization of stop locations
- Hotspot identification

---

## Phase 4 — Multi-Session Comparison & Trend Tracking

**Goal:** Compare stops across multiple overnight test runs to spot trends.

### Tasks
1. **Session management** — list of all uploaded sessions, ability to select multiple for comparison
2. **Day-over-day trend lines** — plot total stops, total stop duration, stops-per-robot across sessions
3. **Stop type trend** — are certain L2/L3 stop types increasing or decreasing over days?
4. **Regression detection** — highlight when a stop type count exceeds a threshold vs. previous sessions
5. **Release comparison** — side-by-side metrics for different software versions tested on same night

### Deliverables
- Multi-session dashboard view
- Trend charts with day-over-day comparison
- Ability to tag sessions with release version and compare

---

## Phase 5 — Polish, Export & Deployment

**Goal:** Production-ready quality, shareable reports.

### Tasks
1. **Dashboard layout** — responsive grid layout, dark/light theme
2. **Export** — download charts as PNG, export filtered data as CSV
3. **Report generation** — one-click summary report (PDF or printable HTML) for sharing with team
4. **Persistent storage** — IndexedDB for larger datasets, import/export of full session history as JSON
5. **Deployment** — static site deployment (GitHub Pages, Vercel, or Netlify)

### Deliverables
- Polished, deployable dashboard
- Export and sharing capabilities

---

## Tech Stack

| Concern | Decision |
|---|---|
| Framework | React 18+ with TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Charts | Recharts (primary) + custom canvas for heatmap |
| ODS parsing | SheetJS (xlsx) — client-side |
| State management | Zustand (lightweight) |
| Data persistence | IndexedDB via idb library |
| Deployment | Static site (GitHub Pages / Vercel) |

---

## File Structure (Target)

```
ProductHealth_Dashboard/
├── public/
├── src/
│   ├── components/
│   │   ├── upload/          # File upload & session form
│   │   ├── charts/          # All chart components
│   │   ├── tables/          # Data table components
│   │   ├── filters/         # Filter panel
│   │   ├── layout/          # Header, sidebar, grid layout
│   │   └── spatial/         # 2D map / heatmap
│   ├── lib/
│   │   ├── parser.ts        # ODS file parsing & filename extraction
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── storage.ts       # IndexedDB persistence
│   ├── store/
│   │   └── useStore.ts      # Zustand store
│   ├── App.tsx
│   └── main.tsx
├── PLAN.md
├── CLAUDE.md
├── package.json
└── ...
```
