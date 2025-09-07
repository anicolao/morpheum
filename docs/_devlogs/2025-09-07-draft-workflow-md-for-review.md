---
title: "Draft WORKFLOW.md for User Review"
date: 2025-09-07
author: "Jules"
tags: ['workflow', 'design', 'documentation']
---

### Actions Taken

1.  Received a user request to distill a set of ideas about bot interaction into a `WORKFLOW.md` file for review before implementation. The core ideas involved changing `!llm status`, scoping repositories to rooms, and defining how users interact with multiple bots.
2.  Read `VISION.md` and `PROJECT_ROOMS.md` to understand the existing project context and design principles.
3.  Synthesized the user's request with the project documentation to create a new `WORKFLOW.md` file. This file outlines the user journey, the desired behavior of `!llm status`, and the principles of multi-agent collaboration in a project room.
4.  Initially, I failed to follow the project's contribution guidelines and just announced the file's creation.
5.  After being corrected by the user, I read `AGENTS.md` to understand the correct process.
6.  Created a new task file (`task-085-draft-workflow-md.md`) and this devlog entry to properly document the work.

### Friction/Success Points

*   **Friction:** My initial failure to read and adhere to `AGENTS.md` caused unnecessary back-and-forth. This was a process error on my part.
*   **Success:** The `AGENTS.md` file was very clear and provided explicit instructions on how to create task and devlog entries, which made correcting my mistake straightforward. The user's guidance was essential for getting me back on track.

### Technical Learnings

*   The contribution process for this repository is file-based, using directories for tasks (`docs/_tasks/`) and development logs (`docs/_devlogs/`). This is a key workflow that I must follow for all future contributions.
*   This method is likely in place to prevent merge conflicts on monolithic `TASKS.md` or `DEVLOG.md` files, which is a clever approach for a project with many contributors (human or AI).
*   Always read `AGENTS.md` or `CONTRIBUTING.md` in a new repository before starting work.
