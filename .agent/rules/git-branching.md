---
trigger: always_on
---

# Git Branching Rule

- NEVER commit directly to `main` or `master`
- At the start of every task, create a new branch: `git checkout -b agent/<short-task-description>`
- Commit changes locally as you go with descriptive commit messages
- Do NOT push the branch unless explicitly asked
- Do NOT create a PR unless explicitly asked
- Wait for the user to say "push" or "create PR" before any remote operations