---
title: "Sync Bot Room Membership"
date: 2026-01-28
author: "Codex"
tags: ["matrix", "multi-agent", "rooms"]
---

## Actions Taken
- Added startup room sync so all bot identities join the union of rooms.
- Logged join attempts and failures per identity.

## Friction/Success Points
- Some rooms may reject joins depending on permissions; warnings are logged per bot.

## Technical Learnings
- Room sync should happen after all clients are started to avoid missing membership lists.
