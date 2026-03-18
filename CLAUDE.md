# CLAUDE.md — ProductHealth_Dashboard

This file provides guidance for AI assistants (Claude and others) working in this repository.

---

## Project Overview

**ProductHealth_Dashboard** is a modular, three-tier dashboard for analyzing overnight robot stop reports. Users upload `.ods` spreadsheets produced by automated test runs, and the dashboard provides interactive visualizations to evaluate test health: stop counts, stop durations, stop type distributions, spatial heatmaps, and multi-session trend tracking across software releases.

---

## Repository State

- **Status:** Modular architecture — Frontend + API + PostgreSQL
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
- Use Zod schemas for API request validation (defined in `shared/src/validation.ts`)

---

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Dashboard   │◄────►│   API Server  │◄────►│  PostgreSQL   │     │  AWS Athena   │
│  React + Vite │ :5173│  Express + TS │ :3000│    16-alpine  │ :5432│ qa.fact_date_ │
│  TailwindCSS  │      │  Drizzle ORM  │      │ product_health│     │    range      │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
                             │                                           ▲
                             │  AWS SSO OIDC device auth flow            │
                             └───────────────────────────────────────────┘
```

| Concern | Decision |
|---|---|
| Frontend framework | React 19 + TypeScript (Vite) |
| Server state management | TanStack React Query |
| Client state management | Zustand (UI state only — no data persistence) |
| API framework | Express 5 + TypeScript |
| ORM | Drizzle ORM (type-safe, lightweight) |
| Database | PostgreSQL 16 |
| Shared types | `@ph/shared` monorepo package |
| Request validation | Zod (shared between frontend and API) |
| Data source | AWS Athena (`qa.fact_date_range`) — session metadata |
| Authentication | AWS SSO OIDC device authorization flow (browser redirect) |
| AWS SDK | `@aws-sdk/client-athena`, `@aws-sdk/client-sso-oidc`, `@aws-sdk/client-sso` |
| File upload | ~~Multer~~ (removed — replaced by Athena integration) |
| ODS parsing | SheetJS (xlsx) — server-side (retained for future stop record parsing) |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| Environment isolation | Docker + docker-compose (works on Mac + Ubuntu 18.04+) |
| Deployment / hosting | Dashboard: nginx (prod Docker stage), API: Node.js |
| Auth mechanism | Dev: IAM keys (~/.aws), Prod: AWS SSO OIDC device auth |
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

# Dashboard: http://localhost:5173
# API:       http://localhost:3000/api/v1/health
# Database:  localhost:5432 (ph_user / ph_dev_pass / product_health)
```

The database schema is automatically migrated on API startup. Edits to files in `dashboard/src/` or `api/src/` are reflected instantly (Vite HMR for frontend, tsx watch for API).

### Stop

```bash
docker compose down          # stop services, keep data
docker compose down -v       # stop services AND delete database volume
```

### Environment Variables

Copy `.env.example` to `.env` at the project root (never commit `.env`):

```
DB_PASSWORD=ph_dev_pass
```

---

## Testing

> To be filled in once testing framework is configured.

### Test Conventions

- Write tests alongside the code they cover
- Aim for unit tests on business logic and integration tests on API boundaries
- Do not commit code that breaks existing tests

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
│   │   ├── index.ts                # Express app entry, route registration
│   │   ├── config.ts               # Environment config (DB, AWS, Athena, SSO)
│   │   ├── db/                     # Drizzle ORM schema + migrations
│   │   │   ├── schema.ts           # Tables: test_sessions, stop_records, patches, athena_sync_log
│   │   │   ├── client.ts           # Database connection pool
│   │   │   └── migrate.ts          # SQL migration runner (runs on startup)
│   │   ├── routes/
│   │   │   ├── auth.ts             # SSO auth endpoints (status, start, poll, logout)
│   │   │   ├── athena.ts           # Athena endpoints (sites, preview, sync, sync-status)
│   │   │   ├── sessions.ts         # Session list/get/delete
│   │   │   ├── stops.ts            # Filtered/paginated stop queries
│   │   │   ├── aggregations.ts     # KPIs, charts, heatmap data
│   │   │   ├── patches.ts          # Patch management
│   │   │   └── modes.ts            # Dashboard mode CRUD
│   │   ├── services/
│   │   │   ├── sso-auth.service.ts # SSO OIDC device auth flow + credential store
│   │   │   ├── athena.service.ts   # Athena query execution
│   │   │   ├── tag-parser.service.ts # Parse tag field into structured data
│   │   │   ├── sync.service.ts     # Preview + sync orchestration (Athena → PostgreSQL)
│   │   │   ├── session.service.ts  # Session list/get/delete
│   │   │   ├── parser.service.ts   # ODS + patch file parsing (legacy, retained for future use)
│   │   │   └── aggregation.service.ts # KPI + chart queries
│   │   ├── middleware/
│   │   │   ├── require-auth.ts     # Auth gate (skips in dev, requires SSO in prod)
│   │   │   └── error-handler.ts    # Express error handler
│   │   └── plugins/               # Dashboard mode plugins
│   └── Dockerfile
├── dashboard/                      # React 19 frontend
│   ├── src/
│   │   ├── main.tsx                # App entry with AuthGate wrapper
│   │   ├── App.tsx                 # Main layout with AthenaSync + ModeRouter
│   │   ├── api/                    # API client functions
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # Auth status, SSO start/poll, logout
│   │   │   └── useSessions.ts      # Session + Athena preview/sync hooks
│   │   ├── components/
│   │   │   ├── auth/               # AuthGate + SSOLogin
│   │   │   ├── athena/             # AthenaSync (preview table, selective import)
│   │   │   └── layout/             # Header (session dropdown, mode tabs)
│   │   ├── modes/                  # Dashboard mode components (lazy-loaded)
│   │   ├── store/                  # Zustand (UI state: session, site, filters)
│   │   └── lib/                    # Type re-exports from @ph/shared
│   └── Dockerfile
├── docker-compose.yml              # Orchestrates db + api + dashboard
├── .env.example                    # Environment variable template
├── .claude/launch.json             # Dev server configs for Claude Code preview
├── CLAUDE.md                       # This file
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
| Dashboard mode | A pluggable view (Overview, Trends, Heatmap, Compare) with its own API endpoints and UI |

---

## Adding a New Dashboard Mode

1. **Backend**: Create `api/src/plugins/mymode.plugin.ts` implementing the `DashboardModePlugin` interface from `registry.ts`
2. **Frontend**: Create `dashboard/src/modes/mymode/MyMode.tsx` as a default export React component
3. **Register**: Import the plugin in `api/src/index.ts` and add to `dashboard/src/modes/registry.ts`
4. No changes to core routing, database schema, or existing modes required

---

## Working with AI Assistants

- Always read existing code before modifying it
- Do not invent file paths or module names — verify they exist first
- When uncertain about a convention not documented here, ask before assuming
- Update this CLAUDE.md file whenever significant architectural decisions are made, new tooling is added, or conventions change
- Branch naming convention for AI work: `claude/<description>-<session-id>`
- **After every change, update `README.md`** to reflect the current state of the project — this is the human-facing entry point. README must always cover: what the project does, prerequisites, how to run it locally (Docker), how to use the dashboard, and the current feature status. A user reading README.md for the first time should be able to get up and running without reading any other file.
