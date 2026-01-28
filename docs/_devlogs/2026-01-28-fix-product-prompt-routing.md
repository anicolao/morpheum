---
title: "Fix Product Prompt Routing"
date: 2026-01-28
author: "Codex"
tags: ["matrix", "personas", "prompting"]
---

## Actions Taken
- Routed non-copilot streaming to the persona-specific prompt instead of the default system prompt.

## Friction/Success Points
- The override path in streaming logic was masking persona prompts.

## Technical Learnings
- Prompt overrides must be applied consistently across both SWEAgent and streaming paths.
