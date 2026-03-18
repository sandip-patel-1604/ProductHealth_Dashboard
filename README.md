# ProductHealth Dashboard

A modular, three-tier dashboard for analyzing overnight robot stop reports. Connects directly to AWS Athena to discover test sessions from the `qa.fact_date_range` table, then provides interactive visualizations of stop counts, durations, stop type distributions, spatial heatmaps, and multi-session trend tracking across software releases.

---

## What It Does

After each overnight test run, test metadata (which robots ran, what software version, start/end times) is recorded in an AWS Athena table. This dashboard:

- **Discovers test runs from Athena** — select a customer site and date range, preview what's available
- **Shows imported vs new** — preview table distinguishes already-imported sessions from new ones with status badges
- **Selective import** — choose which runs to import via checkboxes before syncing
- **Parses tag metadata** — extracts software version, robot serials, config, and patch info from the `tag` field
- **First-time cutoff** — on first sync for a site, a cutoff date prevents importing old historical data
- **See at a glance** how many stops occurred, which robots stopped most, and how long they were halted
- **Drill down** by stop type (L1/L2/L3 classification hierarchy), location, robot, or time
- **Compare across nights** — spot if a stop type is climbing day-over-day or after a software update
- **Switch modes** — Overview, Trends, Heatmap, and Compare modes via tab navigation

### Athena Table Schema (`qa.fact_date_range`)

| Column | Type | Description |
|---|---|---|
| customersitekey | string | Customer site identifier |
| tag | string | Encodes run ID, config, software version, robots, date |
| description | string | Dev/validation run info, patch details |
| start | timestamp | Test run start time |
| end | timestamp | Test run end time |
| robot_id | string | Robot used in that test |

### Tag Format

The `tag` field encodes test run metadata. Example:
```
T1361 30p-AG/2.23.0-VC3+patches w/220,225,481 2026/3/16
```
- `T1361` — run ID (rows sharing the same prefix belong to the same fleet run)
- `30p-AG` — config (30 pallet, above ground)
- `2.23.0-VC3` — software version
- `+patches` — indicates cherry-picked patches
- `w/220,225,481` — robot serial numbers
- `2026/3/16` — test date

---

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Dashboard   │◄────►│   API Server  │◄────►│  PostgreSQL   │     │  AWS Athena   │
│  React + Vite │ :5173│  Express + TS │ :3000│    16-alpine  │ :5432│ qa.fact_date_ │
│  TailwindCSS  │      │  Drizzle ORM  │      │ product_health│     │    range      │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
                             │                                           ▲
                             │  Dev: ~/.aws credentials                  │
                             │  Prod: AWS SSO OIDC browser flow          │
                             └───────────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS v4 + Zustand + Recharts + TanStack React Query |
| API | Node.js + Express 5 + TypeScript + Zod |
| Database | PostgreSQL 16 + Drizzle ORM |
| Data Source | AWS Athena (`qa.fact_date_range`) via `@aws-sdk/client-athena` |
| Auth (dev) | IAM access keys from `~/.aws/credentials` (mounted read-only into Docker) |
| Auth (prod) | AWS SSO OIDC device authorization flow (browser redirect, in-memory credentials) |
| Shared types | `@ph/shared` monorepo package |
| Containerization | Docker + Docker Compose (3 services) |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac) or Docker Engine + docker-compose-plugin (Ubuntu 18.04+)
- AWS credentials with Athena access (see Auth Modes below)
- No Node.js installation required — everything runs inside Docker

---

## Auth Modes

### Development (default)

In dev mode (`NODE_ENV=development`), the dashboard skips the SSO login screen and uses your local AWS credentials automatically.

**Requirements:**
- AWS CLI configured with `~/.aws/credentials` containing access keys that can query Athena
- The `~/.aws` directory is mounted read-only into the API container

```bash
# Verify your credentials work:
aws sts get-caller-identity
aws athena start-query-execution --query-string "SELECT 1" --work-group primary
```

### Production

In production (`NODE_ENV=production`), users must authenticate via AWS SSO browser redirect on every visit. Credentials are:
- Held in-memory only (never written to disk)
- Flushed on logout or server restart
- Checked for expiry before each Athena call

**Required env vars for production:**
```
AWS_SSO_START_URL=https://your-org.awsapps.com/start
AWS_SSO_ACCOUNT_ID=123456789012
AWS_SSO_ROLE_NAME=YourRoleName
```

---

## Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

**For development** (minimum — AWS credentials from `~/.aws` are used automatically):
```env
DB_PASSWORD=ph_dev_pass
ATHENA_OUTPUT_BUCKET=s3://your-athena-results-bucket/
```

**For production** (full config):
```env
DB_PASSWORD=<strong-password>
NODE_ENV=production
AWS_SSO_START_URL=https://your-org.awsapps.com/start
AWS_SSO_REGION=us-east-1
AWS_SSO_ACCOUNT_ID=123456789012
AWS_SSO_ROLE_NAME=YourRoleName
AWS_REGION=us-east-1
ATHENA_DATABASE=qa
ATHENA_WORKGROUP=primary
ATHENA_OUTPUT_BUCKET=s3://your-athena-results-bucket/
```

---

## Running Locally

```bash
git clone <repo-url>
cd ProductHealth_Dashboard
cp .env.example .env   # edit with your ATHENA_OUTPUT_BUCKET at minimum

docker compose up --build
# Dashboard: http://localhost:5173
# API:       http://localhost:3000/api/v1/health
# Database:  localhost:5433 (user: ph_user, db: product_health)
```

The database schema is automatically migrated on API startup. Edits to files in `dashboard/src/` are reflected instantly in the browser (Vite HMR).

### Stop

```bash
docker compose down          # stop services, keep data
docker compose down -v       # stop services AND delete database volume
```

---

## How to Use

1. **Start Docker** — `docker compose up --build`
2. **Open the dashboard** — go to `http://localhost:5173`
   - Dev mode: goes straight to the sync UI (no login needed)
   - Prod mode: click "Sign in with AWS SSO", approve in the browser tab that opens
3. **Select a customer site** — choose from the dropdown (loaded from Athena)
4. **Set date range** — pick start and end dates (defaults to last 7 days)
   - First sync for a site: an amber "Don't import before" cutoff date appears (default: 14 days ago) to prevent importing old data
5. **Click "Preview"** — queries Athena and shows a table of test runs with their status:
   - **New** (blue badge) — not yet in the dashboard, selectable via checkbox
   - **Imported** (green badge) — already synced
6. **Select runs to import** — check individual runs or use "Select All"
7. **Click "Import Selected"** — syncs chosen runs into PostgreSQL; table refreshes to show updated status
8. **Analyze data** — browse KPIs, view patches, and filter stop records in the Overview mode
9. **Switch modes** — use the tab bar for Overview, Trends, Heatmap, and Compare
10. **Switch sessions** — use the session dropdown in the header

---

## Project Structure

```
ProductHealth_Dashboard/
├── shared/                         # @ph/shared — shared TypeScript types + validation
│   └── src/
│       ├── types.ts                # Domain types + Athena/Auth types
│       ├── validation.ts           # Zod schemas (sync, preview, SSO, stops)
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
│   │   │   ├── sessions.ts         # Session CRUD (list, get, delete)
│   │   │   ├── stops.ts            # Filtered/paginated stop queries
│   │   │   ├── aggregations.ts     # KPIs, charts, heatmap data
│   │   │   ├── patches.ts          # Patch management
│   │   │   └── modes.ts            # Dashboard mode CRUD
│   │   ├── services/
│   │   │   ├── sso-auth.service.ts # SSO OIDC device auth flow + credential store
│   │   │   ├── athena.service.ts   # Athena query execution (uses SSO creds or default chain)
│   │   │   ├── tag-parser.service.ts # Parse tag field into structured data
│   │   │   ├── sync.service.ts     # Preview + sync orchestration (Athena → PostgreSQL)
│   │   │   ├── session.service.ts  # Session list/get/delete
│   │   │   └── aggregation.service.ts # KPI + chart queries
│   │   ├── middleware/
│   │   │   ├── require-auth.ts     # Auth gate (skips in dev, requires SSO in prod)
│   │   │   └── error-handler.ts    # Express error handler
│   │   └── plugins/                # Dashboard mode plugins
│   └── Dockerfile
├── dashboard/                      # React 19 frontend
│   ├── src/
│   │   ├── main.tsx                # App entry with AuthGate wrapper
│   │   ├── App.tsx                 # Main layout with AthenaSync + ModeRouter
│   │   ├── api/                    # API client functions
│   │   │   ├── client.ts           # Fetch wrapper with credentials
│   │   │   └── sessions.api.ts     # Session + Athena API clients
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # Auth status, SSO start/poll, logout
│   │   │   └── useSessions.ts      # Session + Athena preview/sync hooks
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── AuthGate.tsx    # Shows login or dashboard based on auth state
│   │   │   │   └── SSOLogin.tsx    # AWS SSO browser redirect login screen
│   │   │   ├── athena/
│   │   │   │   └── AthenaSync.tsx  # Site selector, preview table, selective import
│   │   │   └── layout/
│   │   │       └── Header.tsx      # Session dropdown, mode tabs, sign out
│   │   ├── modes/                  # Dashboard mode components (lazy-loaded)
│   │   ├── store/                  # Zustand (UI state: active session, site, filters)
│   │   └── lib/                    # Type re-exports from @ph/shared
│   └── Dockerfile
├── docker-compose.yml              # Orchestrates db + api + dashboard
├── .env.example                    # Environment variable template
├── .claude/launch.json             # Dev server configs for Claude Code preview
├── CLAUDE.md                       # AI assistant conventions
└── LICENSE
```

---

## API Endpoints

### Auth (no authentication required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/auth/status` | Check auth status (returns `mode: "dev"` in dev) |
| POST | `/api/v1/auth/sso/start` | Start SSO device authorization flow |
| POST | `/api/v1/auth/sso/poll` | Poll for SSO authorization completion |
| POST | `/api/v1/auth/logout` | Clear session credentials |

### Athena (requires authentication)
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/athena/sites` | List distinct customer site keys |
| POST | `/api/v1/athena/preview` | Preview runs with imported/new status |
| POST | `/api/v1/athena/sync` | Sync sessions (optional `runIds` for selective import) |
| GET | `/api/v1/athena/sync-status/:site` | Last sync time for a site |

### Sessions & Data
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/sessions` | List all sessions |
| GET | `/api/v1/sessions/:id` | Get session with stops |
| DELETE | `/api/v1/sessions/:id` | Delete session |
| GET | `/api/v1/sessions/:id/stops` | Filtered/sorted/paginated stops |
| GET | `/api/v1/sessions/:id/kpis` | KPI aggregations |
| GET | `/api/v1/sessions/:id/patches` | Patch records |
| GET | `/api/v1/modes` | List dashboard modes |

---

## License

MIT
