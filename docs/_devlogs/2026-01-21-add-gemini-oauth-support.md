---
title: "Add Gemini OAuth Support"
date: 2026-01-21
author: "Codex"
tags: ["development", "oauth", "gemini", "llm"]
---

## Actions Taken
- Implemented OAuth loopback (PKCE) flow and token storage for Gemini access without API keys.
- Wired OAuth-backed credentials into the shared LLM client factory and updated bot commands to initiate, check, and revoke OAuth sessions.
- Documented OAuth setup, scopes, and default model usage in `OAUTH_SUPPORT.md` and docs site.
- Added helper tooling to append Google OAuth client environment variables into `.secrets`.

## Friction/Success Points
- Google OAuth device flow rejected the Generative Language scopes; loopback was required to complete authorization.
- Misconfigured or stale environment variables (client IDs/scopes) led to repeated `invalid_request` and `invalid_scope` errors until refreshed.
- The Jekyll site required moving root docs into `docs/_includes/` rather than using `include_relative` outside the docs tree.

## Technical Learnings
- Gemini OAuth requires the Desktop app client type and a loopback redirect on `127.0.0.1` with PKCE; device flow is not supported for these scopes.
- The scope value must match the Generative Language API capabilities; mismatched scopes yield `invalid_scope` even when the API is enabled.
- Centralizing OAuth in the LLM client factory avoids diverging auth behavior between bot commands and gauntlet runs.
