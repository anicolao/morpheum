---
title: "Enhanced !llm status command shows room-specific configuration"
order: 114
status: "completed"
phase: "PROJECT_ROOMS"
category: "feature"
---

## Description

The `!llm status` command now displays room-specific configuration when the bot is operating in project rooms, providing users with complete visibility into which configuration settings are being used.

## Acceptance Criteria

- [x] `!llm status` shows global LLM configuration in all rooms
- [x] In project rooms, displays additional project-specific configuration (repository, LLM provider, creation details)
- [x] Indicates room type (project vs regular room) 
- [x] Uses markdown formatting for better readability
- [x] Maintains backward compatibility with existing functionality
- [x] Comprehensive test coverage for both project and regular room scenarios

## Implementation Details

- Modified bot command flow to pass `roomId` to LLM command handlers
- Enhanced status command to check for room-specific configuration via Matrix room state
- Added proper markdown formatting with bold headers and structured output
- Updated test suite to verify new functionality

## User Impact

Users can now run `!llm status` to see:
- Global configuration that applies to regular rooms
- Project-specific configuration when in project rooms (repository, provider, etc.)
- Clear indication of which settings are active for task processing

This addresses user feedback about wanting visibility into room-specific configuration settings that were previously only used internally by the bot.