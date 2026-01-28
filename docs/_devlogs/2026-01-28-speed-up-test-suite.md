---
title: "Speed Up Test Suite"
date: 2026-01-28
author: "Codex"
tags: ["testing", "performance"]
---

## Actions Taken
- Added configurable demo timing for Copilot sessions and tuned tests to use a tiny timeline.
- Reworked message queue tests to use fake timers instead of real delays.
- Confirmed the full test suite completes in under a second.

## Friction/Success Points
- Bun's Vitest build lacks async timer helpers, so tests use explicit timer advancement plus microtask flushing.

## Technical Learnings
- Demo-mode polling based on `Date.now()` can dominate runtime when loops wait on real time.
