---
title: "Add direnv+nix setup instructions to ONBOARDING.md before bun usage"
date: 2025-01-30
author: "copilot"
tags: ["documentation", "onboarding", "direnv", "nix", "development-environment"]
---

## Actions Taken

Updated ONBOARDING.md to address user feedback about jumping into `bun` usage before explaining how to set up the development environment properly.

### Key Changes Made

1. **Added Prerequisites Section**: Created comprehensive direnv+nix setup instructions before the local development section
2. **Nix Installation**: Added clear instructions for installing Nix package manager with the Determinate Systems installer
3. **direnv Setup**: Detailed direnv installation across different platforms (macOS, Ubuntu, others)
4. **Shell Integration**: Included shell hook setup for both bash and zsh
5. **Secrets Management**: Created example `.secrets` file template with all required environment variables:
   - Matrix bot configuration (HOMESERVER_URL, MATRIX_USERNAME, MATRIX_PASSWORD, ACCESS_TOKEN)
   - GitHub configuration (GITHUB_TOKEN)
   - Registration tokens for different homeservers
6. **Workflow Documentation**: Explained the complete workflow: clone → create secrets → allow direnv → use bun

### Environment Variables Documented

Based on analysis of the bot source code (`src/morpheum-bot/index.ts`), documented all required environment variables:
- `HOMESERVER_URL`: Matrix homeserver URL
- `MATRIX_USERNAME` & `MATRIX_PASSWORD`: Bot credentials (or alternatively `ACCESS_TOKEN`)
- `GITHUB_TOKEN`: For GitHub API integration
- `REGISTRATION_TOKEN_*`: For bot registration on different homeservers

## Friction/Success Points

### Success Points
- **Comprehensive Analysis**: Examined the `.envrc`, `flake.nix`, and bot source code to understand the complete environment setup
- **User-Centric Approach**: Addressed the specific feedback about jumping into bun before environment setup
- **Template Creation**: Provided a ready-to-use `.secrets` template with clear comments
- **Test Verification**: All 273 tests continue to pass after documentation changes

### Friction Points
- **Pre-commit Hook Requirements**: Discovered that every commit requires both devlog and task entries, which wasn't initially clear
- **Environment Dependencies**: The CI environment doesn't have bun available, required using npm for testing

## Technical Learnings

1. **Repository Workflow**: The project uses a mandatory documentation workflow where every commit must include both devlog and task entries
2. **direnv Integration**: The `.envrc` file uses `use flake` to activate Nix environment and sources `.secrets` for environment variables
3. **Environment Setup**: The development environment automatically provides bun, ollama, and other tools through Nix when direnv is allowed
4. **Secrets Management**: The `.secrets` file is gitignored and sourced by direnv, providing a clean way to manage sensitive credentials

## Next Steps

- Ensure the task entry is created to satisfy pre-commit requirements
- Test the updated documentation with actual users to validate the direnv+nix setup process