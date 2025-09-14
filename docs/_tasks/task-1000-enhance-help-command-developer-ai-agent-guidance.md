---
title: "Enhance Help Command with Developer and AI Agent Guidance"
order: 1000
status: completed
phase: "Morpheum v0.2: Agent Advancement"
category: "Developer Experience"
---

## Task Description

Enhance the `!help` command in MorpheumBot to provide comprehensive guidance for developers and AI agents working on the Morpheum project. The current help system only covers Matrix bot commands but lacks essential information about development processes, project structure, and agent guidelines.

## Background

Issue #130 requested help functionality for `_dev_ola`, indicating that developers and AI agents need better guidance about the Morpheum development process. The existing help command was missing crucial information found in AGENTS.md and other documentation.

## Requirements

- [x] Add developer-focused sections to the help command
- [x] Include information about the directory-based task and devlog system
- [x] Reference key documentation files (AGENTS.md, README.md, etc.)
- [x] Provide project structure and tooling guidance
- [x] Include important restrictions and guidelines for AI agents
- [x] Maintain backward compatibility with existing functionality
- [x] Update related tests to handle the enhanced format

## Implementation

### Changes Made

1. **Enhanced Help Message Structure:**
   - Added "For Developers & AI Agents" section
   - Added "Important Notes for Agents" section
   - Organized existing commands under "Matrix Bot Commands"

2. **Content Added:**
   - Directory-based system for tasks (`docs/_tasks/`) and devlogs (`docs/_devlogs/`)
   - Key documentation references (AGENTS.md, VISION.md, ARCHITECTURE.md, etc.)
   - Preferred tooling (bun over npm)
   - GitHub Pages documentation links
   - Critical agent restrictions (don't edit TASKS.md/DEVLOG.md directly)

3. **Technical Improvements:**
   - Changed from `sendMessage()` to `sendMarkdownMessage()` for better formatting
   - Updated test expectations in multiple test files

### Files Modified

- `src/morpheum-bot/bot.ts` - Enhanced help command implementation
- `src/morpheum-bot/bot.test.ts` - Updated test expectations
- `src/morpheum-bot/bot-project-commands.test.ts` - Fixed assertions
- `src/morpheum-bot/bot-copilot.test.ts` - Fixed assertions

## Validation

- ✅ All existing tests pass
- ✅ New help content includes comprehensive developer guidance
- ✅ Backward compatibility maintained
- ✅ Markdown formatting works correctly

## Impact

This enhancement significantly improves the developer experience for both human developers and AI agents working on Morpheum by providing essential information about:

- Project structure and conventions
- Development workflow and tools
- Important restrictions and guidelines
- Key documentation locations
- Status page aggregation system

The enhancement directly addresses the need identified in issue #130 and ensures that requests like "_dev_ola: !help" receive comprehensive, actionable guidance.