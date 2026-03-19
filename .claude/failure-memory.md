---
name: failure-memory
description: >
  Captures lessons from failures, retries, backtracks, and wasted work during Claude Code
  sessions, and feeds them back into future planning. Maintains two learning documents:
  a project-level ledger (.claude/lessons.md) for patterns specific to the current codebase,
  and a global ledger (~/.claude/global-lessons.md) for patterns that apply across all projects.
  Triggers whenever a task fails validation and requires a fix, an approach is abandoned or
  rewritten, a session ends with unresolved issues, a handoff documents a risk or watch-out,
  or Claude backtracks on a decision. Also triggers at the START of any planning phase to
  consult existing lessons before producing a task plan. Works in concert with
  task-validation-loop (feeds from its retry log) and claude-code-usage-aware (feeds from
  its handoff risks). Applies ONLY to Claude Code tasks.
---

# Failure Memory: Learn From Every Mistake

Claude Code has no memory between sessions. Without deliberate capture, the same mistakes
repeat across sessions, projects, and users. This skill closes that loop.

Two ledgers, two scopes:
- **Project ledger** (`.claude/lessons.md`) — patterns specific to this codebase, its stack, its quirks.
- **Global ledger** (`~/.claude/global-lessons.md`) — patterns that transcend any single project.

Every failure becomes a future prevention rule. Every backtrack becomes a planning heuristic.

---

## 1 — When to Write a Lesson

Capture a lesson whenever any of these occur:

| Trigger | What Happened | Example |
|---|---|---|
| **Validation retry** | A task failed its test gate and required a fix cycle | FM-2 (idempotency) failed because migration lacked `IF NOT EXISTS` |
| **Approach abandoned** | Code was written then discarded in favor of a different approach | Started with raw SQL, backtracked to ORM after hitting schema drift |
| **Assumption proved wrong** | A decision was made based on a belief that turned out false | Assumed API returns ISO dates; actually returns Unix timestamps |
| **Escalation** | Hit the 3-retry limit and had to involve the user | Auth middleware couldn't be unit-tested without refactoring the router |
| **Session ended dirty** | Handoff document flagged unresolved risks or fragile state | Left a monkey-patch in place because the real fix required a dependency upgrade |
| **Repeated pattern** | The same failure mode category appeared across 2+ tasks in a session | Three separate tasks failed on null-handling — indicates project-wide missing input validation |

**Don't capture trivial typos or one-off slips.** The bar is: "Would knowing this in advance have changed the plan or the approach?" If yes, write it down.

---

## 2 — Lesson Format

Each lesson is a single, dense entry. No prose — just enough to change future behavior.

```markdown
### L-<number>: <Short title>
- **Date:** <YYYY-MM-DD>
- **Trigger:** <retry | backtrack | wrong-assumption | escalation | dirty-end | pattern>
- **Context:** <What task/phase was being worked on — 1 sentence>
- **What went wrong:** <The specific failure — 1–2 sentences>
- **Root cause:** <Why it happened — the actual underlying reason, not the symptom>
- **Lesson:** <The actionable rule for future sessions — imperative voice>
- **Scope:** <project | global>
```

### Example

```markdown
### L-7: SQLite FK constraints off by default
- **Date:** 2025-06-14
- **Trigger:** retry
- **Context:** T_2 schema migration — FK constraint test failed
- **What went wrong:** Foreign key INSERT passed when it should have been rejected
- **Root cause:** SQLite does not enforce FK constraints unless `PRAGMA foreign_keys = ON` is explicitly set per connection
- **Lesson:** In any SQLite project, add `PRAGMA foreign_keys = ON` to the connection initialization. Add this as FM-1 for any future SQLite migration task.
- **Scope:** global
```

---

## 3 — Where Lessons Live

### Project Ledger

```
.claude/lessons.md
```

Contains lessons scoped to this specific project — its stack, its conventions, its known
pitfalls. Persists across sessions in the same repo.

Structure:

```markdown
# Project Lessons — <project name>

## Stack & Environment
- **Language/Runtime:** <e.g., Python 3.12, Node 20>
- **Key Dependencies:** <e.g., SQLite, FastAPI, React 18>
- **Known Quirks:** <populated from lessons as they accumulate>

## Lessons
<lessons ordered by recency, newest first>
```

### Global Ledger

```
~/.claude/global-lessons.md
```

Contains lessons that apply across all projects — language-level gotchas, tool behaviors,
architectural patterns that repeatedly fail or succeed. Travels with the user, not the repo.

Structure:

```markdown
# Global Lessons

## By Category
### Types & Null Handling
<lessons>

### Async & Concurrency
<lessons>

### Database & Migrations
<lessons>

### Testing & Validation
<lessons>

### Dependencies & Environment
<lessons>

### Architecture & Design
<lessons>

## All Lessons (Chronological)
<full lesson entries, newest first>
```

The category index is a second view of the same lessons — it makes lookup fast during
planning. When adding a lesson, add it to both the chronological list and the appropriate
category section.

---

## 4 — When to Read Lessons (The Feed-Forward Loop)

Lessons are useless if they're only written and never read. Claude must consult the ledgers
at these moments:

| Moment | What to Read | How It Affects Behavior |
|---|---|---|
| **Start of any planning phase** (task-validation-loop Phase 2 or claude-code-usage-aware Phase 2) | Both ledgers | Add failure modes to Task Cards that match past lessons. Flag known-risky areas in the phase plan. |
| **Before implementing a task** that touches a technology with known lessons | Project ledger, relevant global category | Pre-apply known fixes (e.g., always set FK pragma for SQLite). |
| **When generating failure mode analysis** | Both ledgers | If a past lesson maps to the current task's stack or pattern, it becomes a mandatory failure mode — don't rediscover what's already known. |
| **Session resume from handoff** | Project ledger | Check if any handoff risks have corresponding lessons with known fixes. |

### How to Apply Lessons During Planning

When a lesson is relevant to a task being planned, add it directly to the Task Card:

```
FAILURE MODES
  FM-1: State — FK constraints not enforced (SQLite default)
         ⚡ FROM LESSON L-7 — known issue, apply PRAGMA fix proactively
  FM-2: Logic — migration not idempotent
  ...
```

The `⚡ FROM LESSON` annotation serves two purposes: it explains why the failure mode was
included (not just guessing), and it lets the user see the learning system working.

---

## 5 — Lesson Lifecycle

Lessons are not permanent. They have a lifecycle:

### Promotion

If a project lesson recurs across 2+ unrelated projects, **promote it to global**:
1. Add it to `~/.claude/global-lessons.md` under the appropriate category.
2. Keep the project entry but add a note: `(promoted to global L-<n>)`.

### Graduation

If a lesson has been consistently applied for 5+ sessions without a related failure,
it can be **graduated** — moved from the active lessons section to an archive section at the
bottom of the ledger. It's still searchable, but it no longer clogs the active reading list.

Mark it:
```markdown
### ~~L-7: SQLite FK constraints off by default~~ → Graduated <date>
```

### Contradiction

If a new experience contradicts an existing lesson, **don't delete the old one**. Add the
new lesson with a cross-reference:

```markdown
### L-22: ORM handles FK pragmas automatically in SQLAlchemy
- ...
- **Supersedes:** L-7 (only when using SQLAlchemy; raw SQLite still needs manual pragma)
```

This preserves context. A lesson that's wrong in one stack may still be right in another.

---

## 6 — Integration With Other Skills

This skill does not operate in isolation. It plugs into the other two:

### ← task-validation-loop (feeds IN)

- Every retry in the validation log is a candidate lesson (Section 1).
- After each session's validation log is complete, scan it for retries and patterns,
  then write lessons.

### → task-validation-loop (feeds OUT)

- During Task Card generation, consult lessons to pre-populate failure modes that match
  the current task's stack and pattern.
- Lessons can escalate a task's risk tier (e.g., a "Low" config task becomes "Medium" if
  a lesson says that config has bitten this project before).

### ← claude-code-usage-aware (feeds IN)

- The "Risks & Watch-outs" section of every handoff document is a lesson source.
- The "Decisions & Rationale" section captures assumption-based decisions that may later
  prove wrong — review them when resuming.

### → claude-code-usage-aware (feeds OUT)

- During phase planning, consult lessons to inform phase sizing and ordering.
  If a lesson says "auth refactors in this codebase always take 2x the estimate," reflect
  that in the phase plan.

---

## 7 — Session End Routine

At the end of every session that involved implementation work:

1. **Scan the validation log** for any retries. For each retry, evaluate whether it meets
   the capture bar (Section 1). If yes, write a lesson.
2. **Scan decisions made during the session.** Did any assumption get proven wrong? Did any
   approach get abandoned? Write lessons for those.
3. **Check for repeated failure mode categories.** If the same category (e.g., Types, State)
   appeared across 2+ tasks, write a **pattern lesson** that flags the systemic issue.
4. **Update both ledgers** as appropriate (project and/or global).
5. **Briefly summarize to the user:** "Added N lessons from this session: [one-line each]."

Do this before writing the handoff document — the lessons inform the handoff's Risks section.

---

## 8 — Bootstrapping

### New Project (no `.claude/lessons.md` exists)

1. Create `.claude/lessons.md` with the header template from Section 3.
2. Read `~/.claude/global-lessons.md` and flag any lessons that match the project's stack.
3. Note these in the project ledger's "Known Quirks" section as pre-loaded context.

### New Global Ledger (no `~/.claude/global-lessons.md` exists)

Create it with the category structure from Section 3, empty. It populates over time.

### Existing Project (`.claude/lessons.md` already exists)

Read it at session start. Always. Before planning, before coding, before anything.

---

## Invariants

1. **Every non-trivial failure produces a lesson.** The bar: "Would knowing this have changed the plan?"
2. **Lessons are read before planning.** Writing lessons without reading them is a write-only log — useless.
3. **Two scopes, two files.** Project lessons live in the repo. Global lessons live in the user's home directory.
4. **Lessons are actionable.** Each lesson contains an imperative rule, not just a description of what happened.
5. **No silent learning.** When a lesson influences a plan, annotate it (`⚡ FROM LESSON`). The user should see the system working.
6. **Lessons evolve.** They promote, graduate, and get superseded — they're not permanent write-once entries.
