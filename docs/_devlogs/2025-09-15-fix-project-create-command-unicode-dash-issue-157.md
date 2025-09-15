---
title: "Fix Project Create Command Unicode Dash Issue #157"
date: 2025-09-15
author: "GitHub Copilot Agent"
tags: ["bug-fix", "bot-commands", "unicode-normalization", "issue-157"]
---

- **High-Level Request:**
  
  - Fix issue #157 where the `!project create --new` command was failing with "Invalid Git URL format" errors

- **Actions Taken:**

  - **Repository Analysis:** Explored the codebase structure and ran existing tests (all 353 passing)
  - **Error Investigation:** Traced the command flow through bot.ts → project-room-manager.ts → git-url-parser.ts
  - **Root Cause Identification:** Discovered that Unicode em dash (—) characters from chat apps weren't being normalized to regular double dashes (--)
  - **Issue Reproduction:** Confirmed the problem occurs when chat applications auto-convert `--new` to `—new`
  - **Solution Implementation:** Added `normalizeArgsArray()` call to `handleProjectCreate()` method in bot.ts
  - **Test Coverage:** Created comprehensive test suite in `src/morpheum-bot/issue-157-fix.test.ts` covering:
    - Unicode dash normalization functionality
    - Both reported command variations
    - Error conditions and edge cases
  - **Verification:** Confirmed fix works for both `!project create —new tabletop-image` and `!project create —new anicolao/nixtabletop`
  - **Regression Testing:** Verified all existing tests continue to pass

- **Technical Learnings:**

  - **Unicode Normalization Pattern:** Discovered that other command handlers in the codebase already had `normalizeArgsArray()` calls, but the project command handler was missing this critical step
  - **Chat Application Behavior:** Learned that many chat applications automatically convert double dashes to Unicode em dashes, requiring normalization in command parsing
  - **Consistent Error Handling:** The `parseGitUrl()` function was correctly rejecting invalid inputs, but the normalization needed to happen earlier in the command processing pipeline
  - **Test Strategy:** Created focused tests that verify both the specific bug fix and prevent future regressions

- **Friction/Success Points:**

  - **Success:** Quick identification of the root cause by tracing the error path systematically
  - **Success:** Found the existing normalization pattern already used elsewhere in the codebase
  - **Success:** Minimal code change required (single line addition) with maximum impact
  - **Success:** Comprehensive test coverage ensures the fix is robust and prevents regression
  - **Friction:** Had to understand the complex command parsing flow across multiple files

- **Files Modified:**
  - `src/morpheum-bot/bot.ts` - Added Unicode dash normalization to project command handler
  - `src/morpheum-bot/issue-157-fix.test.ts` - New comprehensive test suite for regression prevention

**Resolution:** Issue #157 is now completely resolved. Users can successfully create new repositories using `!project create --new` regardless of Unicode dash conversion by their chat application.