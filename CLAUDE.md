# CLAUDE.md — ProductHealth_Dashboard

This file provides guidance for AI assistants (Claude and others) working in this repository.

---

## Project Overview

**ProductHealth_Dashboard** is a project to track product development health based on robot data. The goal is to provide visibility into metrics, trends, and signals derived from automated/robotic systems to help teams understand the health of their product development lifecycle.

> The project is in its initial setup phase. No application code has been written yet.

---

## Repository State

- **Status:** Skeleton repository — implementation not yet started
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

## Planned Architecture (TBD)

The following is a placeholder for architectural decisions to be made:

| Concern | Decision |
|---|---|
| Frontend framework | TBD |
| Backend language / framework | TBD |
| Database | TBD |
| Auth mechanism | TBD |
| Data ingestion (robot data) | TBD |
| Deployment / hosting | TBD |
| CI/CD | TBD |

Update this table as decisions are made.

---

## Development Setup

> To be filled in once the stack is chosen.

### Prerequisites

- [ ] List runtime dependencies here (Node, Python, Go, etc.)

### Install Dependencies

```bash
# Example — update once stack is decided
# npm install
# pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file at the project root (never commit it). Expected variables will be documented here as they are added:

```
# Example
# DATABASE_URL=
# API_KEY=
```

### Running Locally

```bash
# Example — update once stack is decided
# npm run dev
# python main.py
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

> To be filled in once CI/CD and deployment targets are decided.

```bash
# Example — update once stack is decided
# npm run build
```

---

## Project Structure

> To be filled in as the codebase grows. Update this section when adding major new directories or modules.

```
ProductHealth_Dashboard/
├── CLAUDE.md          # This file
├── LICENSE
└── README.md
```

---

## Key Domain Concepts

| Term | Meaning |
|---|---|
| Robot data | Automated test/build/deployment signals produced by CI or physical robots |
| Product health | Aggregate view of quality, velocity, and reliability metrics |
| Dashboard | The UI surface presenting health metrics to engineers/managers |

Expand this glossary as domain language is established.

---

## Working with AI Assistants

- Always read existing code before modifying it
- Do not invent file paths or module names — verify they exist first
- When uncertain about a convention not documented here, ask before assuming
- Update this CLAUDE.md file whenever significant architectural decisions are made, new tooling is added, or conventions change
- Branch naming convention for AI work: `claude/<description>-<session-id>`
