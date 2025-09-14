---
title: "Implement --help Flag for Bot Command Line Interface"
date: 2025-09-14
author: "AI Agent"
tags: ["bot", "cli", "help", "user-experience"]
---

- **High-Level Request:**

  - Add a `--help` flag to the Morpheum bot command line interface to list all available flags and provide comprehensive usage information for users.

- **Actions Taken:**

  - **Code Analysis:** Examined the existing argument parsing implementation in `src/morpheum-bot/index.ts` to understand the current structure and patterns
  - **Interface Enhancement:** Extended the `ParsedArgs` interface to include an optional `help` boolean property
  - **Help Function Implementation:** Created a comprehensive `showHelp()` function that displays:
    - Clear usage syntax for both bun and npm commands
    - All available command line options with descriptions
    - Practical examples for common use cases
    - Complete environment variables documentation
    - Link to project repository for additional information
  - **Argument Parsing Update:** Enhanced the `parseArgs()` function to detect both `--help` and `-h` flags
  - **Unicode Compatibility:** Leveraged existing dash normalization to support Unicode dashes (em dash —, en dash –) from chat applications
  - **Graceful Exit Handling:** Implemented proper help display and clean exit with code 0
  - **Error Message Enhancement:** Updated unknown argument errors to suggest using `--help` for assistance
  - **Comprehensive Testing:** Created `help-flag.test.ts` with 10 test cases covering:
    - Long and short flag recognition
    - Unicode dash compatibility
    - Interaction with existing flags
    - Edge cases and error conditions

- **Friction/Success Points:**

  - **Success:** The existing Unicode dash normalization system made it seamless to support help flags typed with special characters from chat applications
  - **Success:** The argument parsing structure was well-designed, making it straightforward to add the new help functionality without breaking existing features
  - **Success:** All existing tests continue to pass (33/33), demonstrating excellent backward compatibility
  - **Success:** The help output provides comprehensive information that makes the bot more discoverable and user-friendly
  - **Success:** Manual testing confirmed the help flag works correctly with various input formats
  - **Learning:** The project's test infrastructure using Vitest made it easy to add robust test coverage for the new functionality

- **Technical Learnings:**

  - **Argument Parsing Patterns:** The existing parseArgs function follows a clean pattern of normalizing input first, then processing in a single loop
  - **Help Design Best Practices:** Comprehensive help should include usage syntax, options descriptions, examples, environment variables, and links to documentation
  - **Unicode Dash Handling:** The existing normalizeDashes utility handles both em dash (U+2014) and en dash (U+2013) conversion to ASCII dashes
  - **Test Structure:** The project uses a consistent pattern of helper functions in tests to simulate the actual parsing logic
  - **Exit Code Standards:** Help should exit with code 0 (success) rather than error codes, following Unix conventions

---