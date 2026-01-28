---
title: "Adjust Multi-Identity Delegation Model"
date: 2026-01-28
author: "Codex"
tags: ["design", "matrix", "multi-agent"]
---

## Actions Taken
- Updated the multi-identity bot design to require all delegation to occur in the main room via @mentions.
- Replaced the delegation router/envelope concept with a shared-room request/response convention.
- Clarified that prompts and per-bot configuration govern delegation decisions and rejection behavior.

## Friction/Success Points
- The mention-based workflow aligns cleanly with the existing room-centric communication model.

## Technical Learnings
- Keeping delegation in a single room reduces routing complexity but increases the need for clear mention gating and message formatting.
