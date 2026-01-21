---
title: "Fix Pages Workflow Trigger for OAuth Docs"
date: 2026-01-21
author: "Codex"
tags: ["documentation", "github-pages", "workflow"]
---

## Actions Taken
- Updated the GitHub Pages workflow to rebuild when `OAUTH_SUPPORT.md` changes.
- Added a Jekyll documentation page that includes the root OAuth support doc via `include_relative`.
- Linked the new OAuth support page from the documentation index.

## Friction/Success Points
- Ensured the workflow triggers for root documentation updates to keep GitHub Pages current.

## Technical Learnings
- Root-level docs referenced from Jekyll need workflow path triggers to ensure deploys run when only root files change.
