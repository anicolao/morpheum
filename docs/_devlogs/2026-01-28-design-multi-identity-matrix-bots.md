---
title: "Draft Multi-Identity Matrix Bot Design"
date: 2026-01-28
author: "Codex"
tags: ["design", "matrix", "multi-agent"]
---

## Actions Taken
- Reviewed current Matrix bot architecture and identified single-identity assumptions.
- Authored a design proposal for multi-identity Matrix bots with per-bot prompts and delegation.
- Added a Jekyll proposal page and updated the proposals index for public visibility.
- Logged a new task entry to track the design proposal work.

## Friction/Success Points
- Existing single-bot startup flow in `src/morpheum-bot/index.ts` made the multi-identity deltas clear.
- Prior proposal structure provided a straightforward template for the new design page.

## Technical Learnings
- Multi-identity support requires unique Matrix storage files per bot to avoid sync conflicts.
- Delegation routing needs explicit hop limits and origin metadata to prevent message loops.
