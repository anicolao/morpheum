---
title: "Implement --debug flag for bot command logging"
order: 134
status: "completed"
phase: "enhancement"
category: "debugging"
---

## Task: Implement --debug flag for bot command logging

**Status:** Completed ✅

**Issue:** #134

**Description:**
Add a `--debug` flag to the Morpheum bot command line interface that enables logging of all received commands to the console. This feature will help with debugging and monitoring bot interactions.

**Requirements:**
- Add `--debug` flag to command line argument parsing
- Log all received commands when debug mode is enabled
- Include timestamp, sender, room, and command content in logs
- Zero performance overhead when debug mode is disabled
- Maintain backward compatibility

**Implementation:**
- Extended `ParsedArgs` interface with `debug?: boolean` property
- Updated `parseArgs()` function to handle `--debug` flag
- Modified `MorpheumBot` constructor to accept `debugMode` parameter
- Implemented debug logging in `processMessage()` method
- Enhanced help text with `--debug` flag documentation

**Debug Log Format:**
```
[DEBUG] 2025-01-30T10:30:45.123Z - Received command from @user:matrix.org in room !room:matrix.org: "!help"
```

**Usage Examples:**
```bash
# Enable debug logging
bun src/morpheum-bot/index.ts --debug

# Combined with other flags
bun src/morpheum-bot/index.ts --register matrix.morpheum.dev --debug
```

**Testing:**
- Created comprehensive test suite with 10 test cases
- Verified argument parsing for various flag combinations
- Tested debug logging behavior in enabled/disabled states
- Confirmed zero overhead when debug mode is not active
- All 296 tests passing, no regressions introduced

**Files Modified:**
- `src/morpheum-bot/index.ts` - Command line parsing and help text
- `src/morpheum-bot/bot.ts` - Debug logging implementation
- `src/morpheum-bot/debug-flag.test.ts` - Test suite

**Result:**
Bot now supports `--debug` flag that enables comprehensive logging of all received commands, providing valuable debugging and monitoring capabilities for developers and administrators.