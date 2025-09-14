# Contributing to Morpheum

We welcome contributions to the Morpheum project! By contributing, you help us build a more collaborative and efficient software development ecosystem.

**New to the project?** Start with our [Developer Onboarding Guide](ONBOARDING.md) for comprehensive setup instructions including Matrix account creation, bot configuration, and troubleshooting.

## How to Contribute (Matrix-Centric Workflow)

All human interaction and contribution to Morpheum projects are designed to occur primarily within dedicated Matrix rooms. AI agents will handle the underlying Git mechanics (forking, branching, committing, and creating pull requests) based on human instructions.

### 1. Understand the Vision and Architecture

Before you start, please familiarize yourself with the project's vision and architecture:

*   **[VISION.md](VISION.md):** Understand the long-term goals and philosophy of Morpheum.
*   **[ARCHITECTURE.md](ARCHITECTURE.md):** Learn about the core components and how they interact.
*   **[ROADMAP.md](ROADMAP.md):** See what we're currently working on and our near-term plans.

### 2. Development Environment

The development environment is actively transitioning to a Matrix-driven workflow. While local development is still used for complex tasks, the primary mode of interaction is intended to be through the project's Matrix room. All interactions, including code changes, are increasingly initiated by instructing the Morpheum bot. AI agents, each with their own GitHub accounts, will manage the forks and pull requests based on these instructions.

### 3. Find and Define a Task

*   **Check the [ROADMAP.md](ROADMAP.md):** Look for tasks that align with your skills and interests.
*   **Browse Issues:** Check the GitHub issues for open tasks. These issues will typically be managed and updated by AI agents based on discussions in the Matrix room.
*   **Propose a New Feature/Bug Fix:** If you have an idea for a new feature or a bug fix, initiate a discussion in the relevant Matrix room. An AI agent will then create a formal GitHub issue based on this discussion.

### 4. Instruct AI Agents to Make Changes

Instead of directly manipulating Git, human contributors will instruct AI agents within the Matrix room to perform the necessary actions:

*   **Provide Clear Instructions:** Clearly articulate the desired changes, bug fixes, or new features in the Matrix room. Be as specific as possible.
*   **AI Agent Action:** An AI agent will interpret your instructions, create a new branch on its own fork, implement the changes, write tests, and adhere to coding standards.
*   **Automated Pull Request:** The AI agent will then create a pull request from its fork to the main Morpheum repository, referencing the relevant issue.

### 5. Review and Iterate

*   **Review Pull Requests:** Human developers will review the pull requests created by AI agents within GitHub.
*   **Provide Feedback:** All feedback and requests for changes should be communicated back in the Matrix room. An AI agent will then iterate on the changes based on this feedback.
*   **Approve and Merge (AI-Assisted):** Once satisfied, a human developer can instruct an AI agent (potentially a different one, or the same one with elevated permissions) within the Matrix room to approve and merge the pull request.

## AI Agent Contributions

AI agents are central to the Morpheum project. Please refer to the [AGENTS.md](AGENTS.md) document for specific guidelines on how AI agents should contribute, including their responsibilities for Git operations.

## Task and Development Log Management

To avoid merge conflicts, tasks and development logs are managed using a directory-based approach:

### Adding New Tasks

Instead of editing `TASKS.md` directly:

1. Create a new file in `docs/_tasks/` with the naming convention: `task-{number}-{short-description}.md`
2. Include front matter with required fields:
   ```yaml
   ---
   title: "Your Task Title"
   order: 999  # Sequential number for ordering
   status: in-progress  # completed, in-progress, planned
   phase: "Morpheum v0.X: Phase Name"
   category: "Category Name"
   ---
   ```
3. Write the task description in standard markdown format
4. The task will automatically appear on the [unified tasks page](https://anicolao.github.io/morpheum/status/tasks/)

### Adding Development Log Entries

Instead of editing `DEVLOG.md` directly:

1. Create a new file in `docs/_devlogs/` with the naming convention: `{YYYY-MM-DD}-{short-description}.md`
2. Include front matter with required fields:
   ```yaml
   ---
   title: "Your Log Entry Title"
   date: 2025-01-27  # YYYY-MM-DD format
   author: "Your Name or AI Agent"
   tags: ["tag1", "tag2"]  # Optional categorization
   ---
   ```
3. Follow the established format with sections like:
   - **High-Level Request:** or **Actions Taken:**
   - **Friction/Success Points:**
   - **Technical Learnings:** (optional)
4. The entry will automatically appear at the top of the [unified devlog page](https://anicolao.github.io/morpheum/status/devlogs/)

This approach eliminates merge conflicts while maintaining the unified view that contributors expect.

## Code of Conduct

We expect all contributors to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).