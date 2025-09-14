---
title: "Add direnv+nix setup instructions to ONBOARDING.md"
order: 999
status: "complete"
phase: "v0.2"
category: "documentation"
---

## Task Description

Update the ONBOARDING.md documentation to include proper direnv+nix setup instructions before jumping into using `bun` commands.

## Background

User feedback indicated that the onboarding documentation was jumping directly into using `bun install` without explaining how to set up the development environment first. The project uses direnv+nix to automatically provide development tools and manage secrets.

## Requirements

1. Add prerequisites section explaining Nix and direnv installation
2. Document the complete environment setup workflow
3. Provide example `.secrets` file template with all required environment variables
4. Ensure the flow is: clone → setup environment → use tools

## Implementation

- [x] Added comprehensive direnv+nix setup instructions
- [x] Documented Nix package manager installation
- [x] Explained direnv installation and shell integration
- [x] Created `.secrets` template with all environment variables from bot source code
- [x] Verified all tests continue to pass (273 tests)

## Outcome

The ONBOARDING.md now properly guides users through setting up their development environment using direnv+nix before attempting to use `bun` or other development tools. This addresses the specific user feedback and creates a smoother onboarding experience.