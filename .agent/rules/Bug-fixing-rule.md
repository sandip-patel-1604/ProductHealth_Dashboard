---
trigger: always_on
---

# Bug Fixing Protocol

When addressing any bug, strictly adhere to the following procedural workflow:

1. **Implement the Fix**: Identify the root cause and apply the necessary code changes to resolve the bug.
2. **Write Temporary Tests**: Always create and execute an appropriate temporary automated script or pytest to definitively verify whether the applied fix successfully resolves the issue.
3. **Document and Explain**: Once the test succeeds, provide a jargon-free summary containing:
   - *The Root Cause*: Why the bug occurred.
   - *The Fix Applied*: What exactly was changed.
   - *The Resolution*: How the change directly solves the bug.
4. **Assess Future Risks**: Identify any related possible failure points, edge cases, or systemic impacts, and evaluate if they need to be addressed interactively.
5. **Request Human Review**: Ask for the user's input/approval based on your explanation and risk assessment. If further fixes are needed, repeat this exact protocol from step 1.
6. **Clean Up**: Only after the fix is fully verified and approved by complete user consensus, permanently remove all temporary test files and artifacts created during step 2.
