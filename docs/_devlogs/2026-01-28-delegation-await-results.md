---
title: "Await Delegation Results"
date: 2026-01-28
author: "Codex"
tags: ["agents", "delegation", "prompts"]
---

## Actions Taken
- Added delegation detection in the bot loop to dispatch @target requests and pause until completion.
- Captured target bot responses in-room until "Job's done!" and returned the transcript to the delegator.
- Exposed delegation message handling in the Matrix event pipeline.

## Friction/Success Points
- Delegation required coordination between message routing and the SWE agent loop.

## Technical Learnings
- A shared delegation state lets the bot wait asynchronously while still processing room events.
