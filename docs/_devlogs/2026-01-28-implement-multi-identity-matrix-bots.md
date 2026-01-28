---
title: "Implement Multi-Identity Matrix Bots"
date: 2026-01-28
author: "Codex"
tags: ["implementation", "matrix", "multi-agent", "testing"]
---

## Actions Taken
- Added a multi-identity config loader and updated the bot runtime to spin up one Matrix client per identity.
- Introduced per-bot prompt injection and optional LLM overrides for persona-specific behavior.
- Implemented shared-room delegation helper commands (`!bot list`, `!bot whoami`, `!bot request`).
- Refactored the message queue to support per-client queues.
- Added tests for config parsing, identity commands, and the updated message queue.

## Friction/Success Points
- Shared test mocks required adjustment to avoid leaking module mocks across test files.
- The existing mention-handling logic carried forward cleanly into the multi-identity runtime.

## Technical Learnings
- Per-client message queues are required to avoid cross-bot message routing.
- Prompt injection can be layered on top of the existing SWE agent by passing a system prompt at construction time.
