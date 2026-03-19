---
name: task-validation-loop
description: >
  Enforces test-before-proceed discipline in Claude Code development sessions. For every
  implementation task, generates failure mode analysis and unit-level validation tests, then
  gates forward progress on all tests passing. Triggers when a development plan is created
  or about to be created — task lists, numbered plans, phrases like "break this down",
  "plan this out", "start building", or when a spec/CLAUDE.md is being turned into execution
  steps. Applies ONLY to Claude Code tasks, not chat or document generation.
---

# Task Validation Loop

Every implementation task gets a **failure mode analysis before code is written** and a
**test gate before the next task begins**. Bugs are found at the task boundary, not carried
forward.

---

## 1 — When This Applies

Activate when any of these are true:

- A numbered task list or phased plan is being created for a dev session
- A `CLAUDE.md`, spec, or feature description is being converted into execution steps
- Claude Code proposes multi-step implementation work
- The user says anything resembling "plan this", "break this down", "let's build", "create tasks for"

**Skip for single-action work** — renaming a file, adding a comment, updating a version number.
If there's no meaningful failure mode, there's nothing to gate on.

---

## 2 — Plan Interception

Before executing any task, run the full analysis pass:

1. Take the complete task list.
2. Generate a **Task Card** (Section 3) for every non-trivial implementation task.
3. Present the full annotated plan to the user for review.
4. **Wait for confirmation before writing any code.**

This up-front investment pays for itself — discovering a bad assumption in planning costs
minutes; discovering it three tasks later costs an entire session.

---

## 3 — Task Card Format

For each implementation task `T_n`:

```
┌─────────────────────────────────────────────────────┐
│ T_n: [Task title]                                   │
├─────────────────────────────────────────────────────┤
│ IMPLEMENTATION                                      │
│   [Original task description, unchanged]            │
│                                                     │
│ FAILURE MODES                                       │
│   FM-1: [Category] — [What goes wrong and why]      │
│   FM-2: [Category] — [What goes wrong and why]      │
│   FM-3: ...                                         │
│                                                     │
│ TESTS                                               │
│   T_n.1 — [Name]: [What it validates] → [Pass if]  │
│   T_n.2 — [Name]: [What it validates] → [Pass if]  │
│   T_n.3 — ...                                       │
│                                                     │
│ GATE: All T_n.* pass → proceed. Any fail → fix.     │
└─────────────────────────────────────────────────────┘
```

### Scaling the Analysis

Not every task deserves the same depth. Match effort to risk:

| Task Risk | Failure Modes | Tests | Examples |
|---|---|---|---|
| **High** — state mutations, data migrations, auth, concurrency | 5+ across all applicable categories | 1 per FM + happy path + edge cases | DB schema migration, auth flow, payment logic |
| **Medium** — new modules, API endpoints, business logic | 3–5 covering logic, types, interfaces | 1 per FM + happy path | CRUD endpoint, service class, parser |
| **Low** — config, wiring, simple transforms | 1–2 most likely failures | 1–2 smoke tests | Env config, route registration, simple util |

Don't spend 5 failure modes on a config file. Don't spend 1 on a payment processor.

---

## 4 — Failure Mode Analysis

For each task, think across these categories and generate modes for every category that applies:

| Category | What to Look For |
|---|---|
| **Logic** | Off-by-one, inverted condition, wrong operator, short-circuit ordering |
| **State** | Uninitialized value, stale cache, unexpected mutation, missing cleanup |
| **Types** | Null/undefined, wrong coercion, missing optional handling, type mismatch at boundary |
| **Interfaces** | Wrong function signature, incorrect return shape, missing required field |
| **Dependencies** | Import order, missing peer dependency, version mismatch, setup/teardown gap |
| **Concurrency** | Unwaited async, race condition, callback ordering, shared mutable state |
| **I/O** | File not found, network timeout, malformed response, encoding mismatch |
| **Boundary** | Empty input, zero, negative, max value, unicode, very large payload |
| **Environment** | Missing env var, wrong path separator, platform-specific behavior |

**Each failure mode must name the category it belongs to.** This forces breadth — you can't
accidentally write five "Logic" modes and ignore that the task touches the filesystem.

---

## 5 — Validation Test Requirements

Every test must be:

- **Isolated** — tests only this task's code, no cross-component dependencies
- **Deterministic** — same input, same result, every time
- **Automated** — runnable via script, test runner, or CLI; never "check manually"
- **Traceable** — maps to a specific failure mode or explicit happy-path/edge-case

### Preferred test forms (in order)

1. **Test runner** — `pytest`, `jest`, `go test`, etc. if the project already has one configured.
2. **Inline assertion script** — a small script that imports the module, exercises it, and exits 0/1. Use when no test runner exists yet.
3. **CLI validation** — run a command and assert on exit code or stdout. Good for config, migrations, and build tasks.

### Anti-patterns to avoid

- "Run the app and see if it looks right" — not automated, not deterministic
- "Check the UI for the change" — that's integration testing, not unit validation
- Testing implementation details (private methods, internal state) instead of observable behavior
- Tests that depend on network access, real databases, or external services without mocking

### When there's no test runner yet

Write tests as standalone scripts:

```bash
# Example: test_migration.sh — exits 0 on pass, 1 on fail
python run_migration.py
python -c "
import sqlite3
conn = sqlite3.connect('app.db')
tables = [r[0] for r in conn.execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall()]
assert 'users' in tables, 'users table missing'
assert 'sessions' in tables, 'sessions table missing'
print('PASS')
" || exit 1
```

Claude Code can execute these directly. Once a test runner is established, migrate inline scripts into it.

---

## 6 — Execution Loop

For each task in the plan, follow this sequence exactly:

```
FOR EACH T_n:

  1. IMPLEMENT
     Write the code/config/file as specified.

  2. RUN ALL T_n.* TESTS

  3. EVALUATE GATE
     ┌─ All pass → T_n = ✅ COMPLETE → proceed to T_{n+1}
     │
     └─ Any fail →
          a. Identify root cause (reference the failure mode).
          b. Fix the implementation.
          c. Briefly explain what broke and why.
          d. Re-run ALL T_n.* tests (not just the one that failed).
          e. Repeat from (a).

  4. UPDATE VALIDATION LOG (see Section 7)
```

### Hard Rules

- **No deferral.** A failing test is never "noted for later." Fix it now.
- **No partial gates.** All tests must pass, not "most."
- **Re-run all tests after any fix.** A fix for FM-2 can regress FM-1.
- **Max 3 fix-and-retry cycles per task.** If T_n still fails after 3 attempts, stop and escalate to the user: "T_n has failed 3 fix attempts. Here's what's happening: [diagnosis]. Options: (a) I try a different approach, (b) we simplify the task, (c) we skip and flag it as tech debt." This prevents infinite loops on a fundamentally flawed approach.

---

## 7 — Validation Log

Maintain and print after each task completes:

```
VALIDATION LOG
───────────────────────────────────────────────────
Task       Status         Tests    Fails   Retries
───────────────────────────────────────────────────
T_1        ✅ Complete     4/4      0       0
T_2        ✅ Complete     5/5      1       1 (FM-2: idempotency)
T_3        🔄 In progress  —        —       —
T_4        ⬜ Pending       —        —       —
───────────────────────────────────────────────────
```

When a retry occurs, annotate which failure mode triggered it. This builds a pattern library — if FM-2 failures keep recurring across sessions, the planning phase has a blind spot.

---

## 8 — Separation from Integration Testing

This skill governs **task-level unit validation only.**

Integration tests (cross-component flows, API contract tests, end-to-end scenarios) are a
separate concern. They belong as their own task at the **end** of the plan, after all unit
gates have passed.

Do not conflate them:

| This Skill | Integration Tests |
|---|---|
| Tests one task's output in isolation | Tests how multiple tasks interact |
| Runs immediately after implementation | Runs after all tasks complete |
| Mocks external dependencies | Uses real (or realistic) dependencies |
| Gates the next task | Gates the release/merge |

If an integration test suite is needed, plan it as `T_final` — it runs after all individual
gates have passed.

---

## Example

**Original task:** "Set up SQLite database and write schema migration"

```
┌─────────────────────────────────────────────────────┐
│ T_2: Set up SQLite database and schema migration    │
├─────────────────────────────────────────────────────┤
│ IMPLEMENTATION                                      │
│   Initialize SQLite DB, write migration script to   │
│   create tables: users, sessions, events.           │
│                                                     │
│ FAILURE MODES                                       │
│   FM-1: Types — columns created with wrong types    │
│   FM-2: Logic — migration not idempotent, fails     │
│          on second run                              │
│   FM-3: Environment — DB path hardcoded, breaks     │
│          across environments                        │
│   FM-4: State — FK constraints not enforced         │
│          (SQLite default: off)                      │
│   FM-5: Types — missing NOT NULL on required fields │
│                                                     │
│ TESTS                                               │
│   T_2.1 — Schema shape: run migration, query        │
│     sqlite_master, assert 3 tables with correct     │
│     columns → Pass: tables and columns match spec   │
│   T_2.2 — Idempotency: run migration twice          │
│     → Pass: exit code 0 both runs                   │
│   T_2.3 — Configurable path: set DB_PATH env var,   │
│     run migration → Pass: DB created at that path   │
│   T_2.4 — NOT NULL: INSERT with null required field │
│     → Pass: INSERT rejected with constraint error   │
│   T_2.5 — FK enforcement: enable FK pragma, attempt │
│     orphan insert → Pass: FK violation raised        │
│                                                     │
│ GATE: All T_2.* pass → proceed to T_3               │
└─────────────────────────────────────────────────────┘
```

---

## Invariants

1. **Full plan with all Task Cards shown before any code is written.**
2. **Every gate is binary.** All tests pass = proceed. Anything else = fix.
3. **Failures are resolved at the boundary, never carried forward.**
4. **Retry limit of 3.** Escalate to the user after 3 failed fix cycles.
5. **Tests are automated and runnable.** If Claude Code can't execute it, it's not a valid test.
6. **Analysis depth matches task risk.** Don't over-engineer low-risk; don't under-analyze high-risk.
