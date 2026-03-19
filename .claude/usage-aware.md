---
name: usage-aware
description: >
  Governs how Claude Code plans and executes large or complex tasks with session-awareness
  and continuity guarantees. Self-triggers when a task touches 3+ files non-trivially,
  involves multi-step workflows (refactor → test → migrate), risks exceeding session capacity,
  or could leave the codebase broken if interrupted. Bias toward triggering — the overhead
  of planning is negligible compared to the cost of lost context. Applies ONLY to Claude Code
  coding tasks, not chat or document generation.
---

# Claude Code: Usage-Aware Task Execution

Large tasks fail in AI-assisted coding for one reason: **lost context between sessions**.
This skill prevents that by enforcing phased execution, token-aware checkpointing, and
structured handoffs that let any future session resume without re-discovery.

---

## 1 — Triage: Is This a Large Task?

Before writing any code, evaluate the task against these signals:

| Signal | Threshold |
|---|---|
| Files touched non-trivially | ≥ 3 |
| Distinct logical steps | ≥ 3 (e.g., scaffold → implement → test → migrate) |
| Estimated token cost | > 50k |
| Interrupt risk | Stopping mid-way could leave broken imports, partial migrations, or failing tests |

**If any signal fires → apply this protocol.**
If none fire, skip it — don't over-process a one-file bug fix.

---

## 2 — Phase Plan (Before Any Code)

Decompose the task into **phases** — ordered, named units of work.

### Phase Design Constraints

Each phase MUST be:

- **Atomic** — completable in one session; the codebase compiles and tests pass at phase end.
- **Verifiable** — has an explicit done-condition (tests green, endpoint responds 200, build succeeds).
- **Right-sized** — target ≤ 50k tokens of work per phase. If a phase feels bigger, split it before starting.

### Planning Heuristics

- Prefer more phases over fewer. Six small safe steps beat two ambitious leaps.
- Front-load the riskiest work. Discover unknowns early when you have the most session budget.
- Isolate destructive operations (schema migrations, file renames, dependency upgrades) into their own phases so rollback is trivial.
- If the task has a parallel structure (e.g., "apply the same refactor to 5 services"), plan one phase as the pattern, then batch the rest.

### Present the Plan

```
## Task: <short title>

### Phases
1. [Phase Name] — <one-line description> | Done when: <condition>
2. [Phase Name] — <one-line description> | Done when: <condition>
3. ...

Estimated total phases: <n>
Starting with Phase 1. Confirm or adjust?
```

**Wait for user confirmation before writing any code.**

---

## 3 — Execution With Token Checkpoints

### When to Check

Check token usage **at subtask boundaries** — after completing a function, a file, a test suite,
or an agent's assigned unit of work. Not continuously; not mid-statement.

### What to Do

| Token Usage | Action |
|---|---|
| < 80% of session capacity (~800k) | Continue to next subtask. |
| 80–90% (~800k–900k) | **Wrap up.** Finish the current subtask cleanly. Do NOT start a new subtask. Write handoff and stop. |
| ≥ 90% (~900k+) | **Stop immediately** after the current subtask. Write handoff. Do not proceed. |

### Multi-Agent Execution

Each agent checks its own usage independently after its assigned task completes. An agent
that crosses threshold writes its portion of the handoff and does not pick up additional work.
The orchestrating agent is responsible for merging partial handoffs into one coherent document.

### Execution Tracking

While working, maintain awareness of:
- Current phase and subtask
- What has been completed (files changed, tests added)
- What remains in this phase
- Any decisions made or deferred

---

## 4 — Handoff Document

When a token threshold is crossed **or** a natural phase boundary is reached, write a handoff
before stopping.

### Location

```
.claude/handoff.md
```

Always the `.claude/` directory in the project root. Never the repo root. Never a temp directory.
Overwrite any existing handoff — there is exactly one active handoff at a time.

### Format

```markdown
# Handoff — <YYYY-MM-DD>

## Task
<Original goal in 1–3 sentences.>

## Phase Plan
1. [Phase Name] — ✅ Complete
2. [Phase Name] — ✅ Complete
3. [Phase Name] — 🔄 In progress  ← you are here
4. [Phase Name] — ⬜ Not started
5. ...

## Current Phase Detail
**Phase:** <number and name>

**Completed this phase:**
- <concrete work: file changed, function added, test written>
- ...

**Remaining this phase:**
- <specific next action with file/function name>
- ...

## Resume Prompt
> Resume the [task name] task. Read `.claude/handoff.md` for context.
> Next action: [one-line description of the exact next step].

## Decisions & Rationale
- <Decision made> — because <reason>. (Include alternatives considered if non-obvious.)
- ...

## Risks & Watch-outs
- <Anything fragile, untested, or requiring care in the next session>
- ...
```

### Handoff Quality Rules

- **Be concrete.** "Refactor remaining services" is useless. "Apply the `ConnectionPool` wrapper to `OrderService` and `PaymentService` following the pattern in `UserService` (completed in Phase 2)" is resumable.
- **Capture rationale.** Future-you has zero memory. If you chose approach A over B, say why.
- **Name files and functions.** The handoff should read like a diff description, not a status report.

---

## 5 — Session Resume

When Claude Code starts a new session in a project containing `.claude/handoff.md`:

1. **Read it first** — before any other action.
2. **Confirm with the user:** "Found a handoff for [task]. Resuming at [next action]. Proceed?"
3. **Pick up exactly where it left off.** Do not re-do completed phases. Do not re-plan unless the user requests it.
4. **Validate the codebase state** before resuming work — run tests or build to confirm the last session left things clean.

If no handoff exists, treat the task as new.

---

## 6 — Invariants

These rules are non-negotiable:

1. **Every phase boundary = stable codebase.** Tests pass. Builds succeed. No broken imports.
2. **Never start a new phase without completing the current one.** Partial phases are the #1 source of broken handoffs.
3. **Handoff before stopping.** If you're running out of tokens, the handoff is the last thing you write, not the first thing you skip.
4. **One active handoff.** `.claude/handoff.md` is overwritten each time — it reflects current state, not history.
5. **Plan before code.** Phase plan is presented and confirmed before any file is modified.
6. **Split, don't stretch.** If a phase is running long, stop, write a handoff, and split the remainder into sub-phases in the next session. Do not push through and risk a broken state.
