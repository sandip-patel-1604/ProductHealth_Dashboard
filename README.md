# ProductHealth Dashboard

A React-based dashboard for analyzing overnight robot stop reports. Upload `.ods` spreadsheets from automated test runs and get interactive visualizations of stop counts, durations, stop type distributions, spatial heatmaps, and multi-session trend tracking across software releases.

**Status:** Starting fresh — clean scaffold only.

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

## Project Structure

```
ProductHealth_Dashboard/
├── dashboard/              # Vite + React 19 + TypeScript app
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile          # Multi-stage: dev (hot reload) + prod (nginx)
│   └── package.json
├── docker-compose.yml      # Dashboard service
├── start-dev.sh
├── stop.sh
├── PLAN.md                 # Phased implementation roadmap
├── CLAUDE.md               # AI assistant conventions
└── LICENSE
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript (Vite) |
| Styling | Tailwind CSS v4 |
| Containerization | Docker + Docker Compose |

---

## License

MIT
