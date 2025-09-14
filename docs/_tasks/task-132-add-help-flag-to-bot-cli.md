---
title: "Add --help flag to bot command line interface"
order: 132
status: "completed"
phase: "enhancement"
category: "user-experience"
---

## Task: Add --help flag to bot command line interface

**Status:** Completed ✅

**Issue:** #132

**Description:**
Implement a `--help` flag for the Morpheum bot command line interface that displays comprehensive usage information including all available flags, examples, and environment variables.

**Requirements:**
- Support both `--help` and `-h` short form
- Display comprehensive usage information
- Work with Unicode dash normalization
- Exit gracefully after showing help
- Maintain backward compatibility

**Implementation:**
- Added `help` property to `ParsedArgs` interface
- Created `showHelp()` function with comprehensive documentation
- Enhanced argument parsing to detect help flags
- Added support for Unicode dashes via existing normalization
- Implemented graceful exit with code 0
- Updated error messages to suggest `--help`

**Testing:**
- Created comprehensive test suite with 10 test cases
- Verified Unicode dash compatibility
- Confirmed backward compatibility (33/33 tests passing)
- Manual verification of help output and exit behavior

**Files Modified:**
- `src/morpheum-bot/index.ts` - Main implementation
- `src/morpheum-bot/help-flag.test.ts` - Test suite

**Result:**
Users can now use `--help` or `-h` to get comprehensive information about all available command line options, improving discoverability and user experience.