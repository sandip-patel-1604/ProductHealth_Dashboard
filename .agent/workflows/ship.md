---
description: Squash all local commits on the current branch into one, push, and open a PR
---

# Ship Workflow
Trigger: /ship

Goal: Squash all local commits on the current branch into one, push, and open a PR.

Steps:
1. Identify the current branch name
2. Find the commit where this branch diverged from main:
   `git merge-base main HEAD`
3. Squash all commits since that point:
   `git reset --soft <merge-base-hash>`
4. Ask the user for a single commit message, or summarize the changes from git diff --cached and suggest one
5. Commit with the squashed message: `git commit -m "<message>"`
6. Push the branch: `git push origin <branch-name>`
7. Create a PR using gh CLI:
   `gh pr create --base main --head <branch-name> --title "<message>" --body "<summary>"`