---
title: "Auto-Invite Bot Rooms"
date: 2026-01-28
author: "Codex"
tags: ["matrix", "multi-agent", "rooms"]
---

## Actions Taken
- Updated startup room sync to have @morpheum invite other bots before they attempt to join rooms.
- Logged invite/join results for easier diagnostics.

## Friction/Success Points
- Invite permissions are required; failures are logged per room and bot.

## Technical Learnings
- Inviting before joining avoids M_NOT_FOUND/M_FORBIDDEN errors on rooms where bots lack access.
