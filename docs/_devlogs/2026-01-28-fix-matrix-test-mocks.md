---
title: "Stabilize Matrix Test Mocks"
date: 2026-01-28
author: "Codex"
tags: ["testing", "matrix", "stability"]
---

## Actions Taken
- Adjusted Matrix SDK imports in tests to avoid ESM named-export errors.
- Removed global Matrix SDK mocks that leaked into other test files.
- Re-ran the full test suite to confirm stability.

## Friction/Success Points
- Bun test runs surfaced mock leakage that did not reproduce in single-file runs.

## Technical Learnings
- Module-level mocks can bleed across Bun test files; keep mocks local or remove them when unused.
