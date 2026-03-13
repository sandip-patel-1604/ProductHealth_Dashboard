---
description: Squash all local commits on the current branch into one, push, and open a PR
---

# Ship Workflow
Trigger: /ship

Goal: Squash all local commits on the current branch into one, push, and open a PR.

Steps:
1. update README

- Once we are ready to push the commit to remote, update README.md file
- README.md should be update with clear instructions, disclaimer as well as warning if any for the first time user to be able to use the project
- README should be a only and solid documentation for users of all the level.
2. Identify the current branch name
3. Find the commit where this branch diverged from main:
   `git merge-base main HEAD`
4. Squash all commits since that point:
   `git reset --soft <merge-base-hash>`
5. Ask the user for a single commit message, or summarize the changes from git diff --cached and suggest one
6. Commit with the squashed message: `git commit -m "<message>"`
7. Push the branch: `git push origin <branch-name>`
8. Create a PR using gh CLI:
   `gh pr create --base main --head <branch-name> --title "<message>" --body "<summary>"`