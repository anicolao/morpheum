---
title: "Bug: tests do not pass when run with bun, only with npm"
order: 138
status: "pending"
phase: "bug-fix"
category: "testing"
---

## Task: Bug - tests do not pass when run with bun, only with npm

**Status:** Pending

**Description:**
Tests fail when executed with `bun test` but pass when run with `npm test`. This creates inconsistency in the development workflow and breaks the project's preference for using bun as the primary package manager.

**Problem:**
- Tests fail with bun but pass with npm
- Inconsistent behavior between package managers
- Violates project preference for bun over npm
- Developers must use npm for testing despite bun being preferred

**Requirements:**
- Tests should pass consistently with both bun and npm
- Maintain bun as the preferred package manager
- Identify and fix bun-specific test execution issues
- Ensure test configuration works with both environments

**Acceptance Criteria:**
- [ ] All tests pass when run with `bun test`
- [ ] All tests continue to pass with `npm test`
- [ ] Test configuration is compatible with both package managers
- [ ] CI/CD pipeline can use bun for test execution
- [ ] Documentation updated to reflect bun test usage