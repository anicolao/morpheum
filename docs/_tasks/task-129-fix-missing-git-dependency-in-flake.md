---
title: "Fix missing git dependency in main flake.nix"
order: 129
status: completed
phase: "Development"
category: "Bug Fix"
---

- [x] **Fix missing git dependency in flake.nix**
  - [x] Analyzed issue #128 where pre-commit hooks fail due to missing git binary
  - [x] Identified git command usage in .husky/pre-commit hook:
    - `git diff --name-only` (unstaged changes check)
    - `git ls-files --others --exclude-standard` (untracked files check)  
    - `git diff --cached --name-only` (staged files check)
  - [x] Added `git` to packages list in main flake.nix maintaining alphabetical order
  - [x] Verified no regression - all tests continue to pass
  - [x] Confirmed the fix targets the correct flake.nix (main vs jail)

This ensures developers using `nix develop` have access to git commands required by the project's pre-commit hooks.