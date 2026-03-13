---
trigger: always_on
---

# Git Branching & Workflow Protocol

Strict adherence to a controlled, offline-first branch workflow is mandatory to safeguard the default repository state.

1. **Branch Protection**: NEVER commit directly to the `main` or `master` branches under any circumstances.
2. **Branch Creation Policy**: At the very beginning of every new task or bug fix, create and checkout a new branch following the exact naming convention: `Antigravity/<short-task-description>` (e.g., `Antigravity/add-database-backend`).
3. **Atomic Local Commits**: Commit your changes locally and frequently as you progress. Use clear, descriptive, and atomic commit messages conforming to standard conventional commit formats (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
4. **Remote Operation Ban**: Do NOT push your branch to the remote origin or execute any commands that alter the remote state unless precisely instructed by the user.
5. **Pull Request Ban**: Do NOT attempt to create/open a Pull Request unless the user explicitly asks for it.
6. **Explicit Approval Requirement**: You must wait in a stalled state for the user to explicitly say "push", "ship", or "create PR" before executing any remote operations.