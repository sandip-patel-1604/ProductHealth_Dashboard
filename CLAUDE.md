# CLAUDE.md — ProductHealth_Dashboard

This file provides guidance for AI assistants (Claude and others) working in this repository.

---

## Project Overview

**ProductHealth_Dashboard** is a React-based dashboard for analyzing overnight robot stop reports. Users upload `.ods` spreadsheets produced by automated test runs, and the dashboard provides interactive visualizations to evaluate test health: stop counts, stop durations, stop type distributions, spatial heatmaps, and multi-session trend tracking across software releases.

---

## Repository State

- **Status:** Phase 1 in progress — Docker + Vite scaffold complete
- **License:** MIT
- **Primary branch:** `master`

---

## Development Guidelines

### General Conventions

- Keep commits small and focused on a single concern
- Write descriptive commit messages in the imperative mood (e.g. "Add dashboard component" not "Added dashboard component")
- Do not commit secrets, API keys, or credentials — use environment variables and `.env` files (gitignored)
- Prefer editing existing files over creating new ones unless a new file is clearly necessary
- Avoid over-engineering; implement the minimum needed for the current task

### Code Style

- Follow the language/framework conventions established once the stack is chosen
- When a linter or formatter is configured, run it before committing
- Add comments only where logic is not self-evident — do not comment obvious code

### Security

- Never introduce command injection, XSS, SQL injection, or other OWASP Top 10 vulnerabilities
- Validate all external input (user input, API responses, file reads)
- Do not expose internal errors or stack traces to end users

---

## Architecture

| Concern | Decision |
|---|---|
| Frontend framework | React 19 + TypeScript (Vite) |
| Backend language / framework | TBD (API service planned, stub in docker-compose) |
| Database | PostgreSQL (planned — stub in docker-compose) |
| Auth mechanism | TBD |
| ODS parsing | SheetJS (xlsx) — client-side, no upload to server |
| State management | Zustand |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| Environment isolation | Docker + docker-compose (works on Mac + Ubuntu 18.04+) |
| Deployment / hosting | Static site via nginx (prod Docker stage) |
| CI/CD | TBD |

See `PLAN.md` for the full phased implementation plan.

---

## Development Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac) or Docker Engine + docker-compose-plugin (Ubuntu)
- No Node.js installation required on the host — everything runs inside Docker

### Start the dev server (hot reload)

```bash
# From the repo root:
docker compose up --build

# Dashboard is available at http://localhost:5173
```

Edits to files in `dashboard/src/` are reflected instantly in the browser (Vite HMR through Docker volume mount).

### Stop

```bash
docker compose down
```

### Production build (local test)

```bash
docker build --target prod -t ph-dashboard ./dashboard
docker run -p 8080:80 ph-dashboard
# Visit http://localhost:8080
```

### Environment Variables

Create a `.env` file at the project root (never commit it). Expected variables will be documented here as they are added:

```
# DATABASE_URL=postgresql://ph_user:ph_pass@db:5432/product_health
# API_KEY=
```

---

## Testing

> To be filled in once testing framework is configured.

### Running Tests

```bash
# Example — update once stack is decided
# npm test
# pytest
```

### Test Conventions

- Write tests alongside the code they cover
- Aim for unit tests on business logic and integration tests on API boundaries
- Do not commit code that breaks existing tests

---

## Build & Deployment

```bash
# Build production image
docker build --target prod -t ph-dashboard ./dashboard

# Run production image locally
docker run -p 8080:80 ph-dashboard
```

---

## Project Structure

> To be filled in as the codebase grows. Update this section when adding major new directories or modules.

```
ProductHealth_Dashboard/
├── dashboard/                  # Vite + React + TypeScript app
│   ├── src/
│   │   ├── components/         # UI components (charts, tables, filters, upload)
│   │   ├── lib/                # ODS parser, types, storage utilities
│   │   ├── store/              # Zustand state store
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile              # Multi-stage: dev (hot reload) + prod (nginx)
│   └── package.json
├── docker-compose.yml          # Orchestrates dashboard (+ future db / api)
├── PLAN.md                     # Phased implementation roadmap
├── CLAUDE.md                   # This file
└── LICENSE
```

---

## Key Domain Concepts

| Term | Meaning |
|---|---|
| Stop report | An `.ods` file recording all unplanned robot stops for one overnight test run |
| Test session | One overnight test run: one server, one software version, one or more robots, one time window |
| RobotId | Numeric ID of a physical robot (e.g., 220, 221, 310) |
| L1 / L2 / L3 stop reason | Hierarchical stop classification (L1 = broadest, L3 = most specific) |
| STOP_DURATION | Seconds the robot was halted — directly impacts test throughput |
| POSE_X / POSE_Y | Robot's 2D floor coordinates at time of stop (meters) |
| STOP_LOCATION_CODE | Named warehouse zone where the stop occurred |
| Server | The test server name, embedded in the `.ods` filename (e.g., b023) |
| Product health | Aggregate view of quality, velocity, and reliability across test sessions |

---

## Working with AI Assistants

- Always read existing code before modifying it
- Do not invent file paths or module names — verify they exist first
- When uncertain about a convention not documented here, ask before assuming
- Update this CLAUDE.md file whenever significant architectural decisions are made, new tooling is added, or conventions change
- Branch naming convention for AI work: `claude/<description>-<session-id>`
