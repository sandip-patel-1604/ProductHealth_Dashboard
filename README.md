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

### Stop Report File Format

Files follow the naming convention:
```
{server}_{startTime}_{endTime}_stops.ods
```
Example: `b023_2026_03_10T17_42_2026_03_10T19_46_stops.ods`

The server name, test start time, and test end time are extracted automatically from the filename.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac) or Docker Engine + docker-compose-plugin (Ubuntu 18.04+)
- No Node.js installation required — everything runs inside Docker

---

## Running Locally

```bash
git clone <repo-url>
cd ProductHealth_Dashboard

./start-dev.sh
# Dashboard: http://localhost:5173
```

Edits to files in `dashboard/src/` are reflected instantly in the browser (Vite HMR).

### Stop

```bash
./stop.sh
```

---

## How to Use

1. **Start the Docker server** (see above).
2. **Upload a stop report** — drag-and-drop or click the upload zone to select one or more `.ods` files.
3. **Add session metadata** — Release version is required to track software baselines.
4. **Attach a patch spreadsheet** (optional) — include rows with `Project`, `Patch set`, and `Description`.
5. **Click "Upload & Parse"** — Data is parsed client-side and stored in your browser (localStorage).
6. **Analyze Data** — Browse KPIs, view Patches, and filter through the Stop Records table.
7. **Switch sessions** — Use the session dropdown in the header to switch between uploaded sessions.

---

## Project Structure

```
ProductHealth_Dashboard/
├── dashboard/                      # Vite + React 19 Frontend
│   ├── src/
│   │   ├── components/             # UI components (charts, tables, filters, upload)
│   │   ├── lib/                    # ODS parser, types
│   │   ├── store/                  # Zustand state store (localStorage persistence)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile                  # Multi-stage: dev (hot reload) + prod (nginx)
│   └── package.json
├── docker-compose.yml              # Dashboard service
├── start-dev.sh
├── stop.sh
├── PLAN.md                         # Phased implementation roadmap
├── CLAUDE.md                       # AI assistant conventions
└── LICENSE
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript (Vite, TailwindCSS, Zustand, Recharts) |
| Data parsing | SheetJS (xlsx) — client-side ODS parsing |
| State persistence | Zustand persist middleware (localStorage) |
| Containerization | Docker + Docker Compose |

---

## License

MIT
