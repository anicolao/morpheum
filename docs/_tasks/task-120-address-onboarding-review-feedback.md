---
title: "Address ONBOARDING.md review feedback"
order: 120
status: completed
phase: "Morpheum v0.2: Agent Advancement"
category: "Documentation"
---

## Task Description

Apply comprehensive review feedback from PR #119 to fix incorrect Matrix setup instructions and remove unnecessary sections from ONBOARDING.md.

## Requirements

**Review Feedback to Address:**
1. Fix Element.io UI instructions (hover over "Sign in" and click "Open element web")
2. Remove unnecessary Morpheum homeserver option for team members
3. Fix Security Key Setup section location and button name
4. Remove incorrect "Secure Backup" step
5. Remove unnecessary Recovery Passphrase section
6. Update verification process - clicking user's profile picture shows "Verify user" button
7. Remove entire Team Member Verification section
8. Remove bot invitation section - project room already has bot, keep only !help
9. Remove entire troubleshooting bot issues section
10. Update package manager preference - put bun install first
11. Remove unnecessary Step 8: Project-Specific Commands section

**Integration Requirements:**
- Maintain Jekyll documentation integration
- Update related documentation files (README.md, CONTRIBUTING.md)
- Preserve directory-based documentation system

## Implementation Details

**Primary Changes:** Updated ONBOARDING.md with all 12 feedback items
**Related Updates:** Jekyll page, documentation index, README.md, CONTRIBUTING.md
**Documentation System:** Created required devlog and task entries

## Acceptance Criteria

- [x] Fixed Element.io UI instructions per review feedback
- [x] Removed unnecessary Morpheum homeserver section
- [x] Corrected Security Key Setup path and button name
- [x] Removed non-existent "Secure Backup" step references
- [x] Removed Recovery Passphrase section entirely
- [x] Updated verification process instructions
- [x] Removed Team Member Verification section
- [x] Simplified bot section - removed invitation, kept !help
- [x] Removed troubleshooting section entirely
- [x] Fixed package manager preference order (bun first)
- [x] Removed Project-Specific Commands section
- [x] Maintained Jekyll integration and documentation links
- [x] Updated README.md and CONTRIBUTING.md references
- [x] All changes preserve document flow and readability

## GitHub Issue

Addresses feedback on: PR #119