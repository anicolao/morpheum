---
title: "Fix !project create --new Command Unicode Dash Issue"
order: 158
status: completed
phase: "Bug Fix"
category: "Bot Commands"
---

- [x] **Fix Project Create Command Unicode Dash Issue (Issue #157)**
  - [x] Analyze the `!project create --new` command flow in bot.ts
  - [x] Trace the error path through project-room-manager.ts and git-url-parser.ts
  - [x] Identify that "Invalid Git URL format" error originates from parseGitUrl() function
  - [x] Reproduce the issue with actual command testing
  - [x] Identify the root cause: missing dash normalization in project command handler
  - [x] Fix the issue by adding Unicode dash normalization to handleProjectCreate() method
  - [x] Add comprehensive tests to prevent regression
  - [x] Verify the fix works for both reported cases (`!project create —new tabletop-image` and `!project create —new anicolao/nixtabletop`)
  - [x] Ensure all 353 existing tests continue to pass

This task fixes issue #157 where the `!project create --new` command was failing with "Invalid Git URL format" errors due to Unicode em dash (—) characters being interpreted differently than regular double dashes (--). The solution involved adding `normalizeArgsArray()` function calls to make the project command handler consistent with other command handlers that already had this normalization.

**Root Cause:** Chat applications automatically convert double dashes (`--`) to Unicode em dashes (`—`), but the project command handler was missing the normalization step that other command handlers already had.

**Solution:** Added Unicode dash normalization in the `handleProjectCreate()` method, making it consistent with other command handlers throughout the codebase.

**Impact:** Users can now successfully create new repositories using the `!project create --new` command regardless of whether their chat application auto-converts dashes to Unicode characters.