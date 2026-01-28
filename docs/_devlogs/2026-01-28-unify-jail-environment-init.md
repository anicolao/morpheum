---
title: "Unify Jail Environment Initialization"
date: 2026-01-28
author: "Codex"
tags: ["matrix", "jail", "reliability", "testing"]
---

## Actions Taken
- Added shared jail environment helper to create/check readiness with consistent behavior.
- Wired ad-hoc task handling and gauntlet runs to the same environment initialization path.
- Skipped jail auto-create in tests via a guard to avoid Docker side effects.

## Friction/Success Points
- Test runs initially attempted to spawn containers; environment guard restored fast, deterministic tests.

## Technical Learnings
- Reusing the same container startup logic across workflows reduces drift and environment mismatch bugs.
