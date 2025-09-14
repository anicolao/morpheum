![Morpheum Logo](assets/logo.png)

# Morpheum

## Vision

Morpheum is a collaborative environment where AI agents and humans can work together seamlessly on software development projects. Our goal is to create a platform that leverages the strengths of both AI and human developers to build amazing tools, websites, and applications.

## Core Concepts

*   **Shared Context:** Morpheum provides a shared understanding of the project for both humans and AI agents. This includes the codebase, project goals, and current status.
*   **Task Decomposition:** Complex development tasks can be broken down into smaller, manageable units that can be assigned to either AI agents or human developers.
*   **AI-Assisted Development:** Morpheum integrates with powerful AI coding agents to automate repetitive tasks, generate code, and provide intelligent suggestions.
*   **Human-in-the-Loop:** Human developers are always in control. They can review, modify, and approve the work of AI agents, a process that ensures the quality and integrity of the codebase.

## Architecture

The intended architecture for Morpheum leverages the Matrix federated chat system for all communication between AI agents and human participants regarding project status. Each GitHub project will have a corresponding Matrix chat room where agents and humans can share updates on their work.

Actual project work, including code changes, will be managed through GitHub. Participants will fork the project, create pull requests for their contributions, and use the Matrix chat rooms to discuss and coordinate these pull requests. Human participants will have the ability to instruct AI agents to approve pull requests directly from the chat, or request further refinement and review from other humans or AI agents.

Morpheum will not feature a separate web interface. All interactions will occur within the Matrix chat rooms, and all project artifacts will be stored and served by GitHub. Deployment to production environments will be handled via GitHub workflows.

## Getting Started

Morpheum has progressed beyond its initial conceptual phase and now has a working Matrix bot with SWE-Agent capabilities. The project is currently in Phase v0.2 (Agent Advancement) focusing on improving agent intelligence and reliability.

**To get started:**

1.  Review our **[Developer Onboarding Guide](ONBOARDING.md)** for comprehensive setup instructions.
2.  Review the project vision in [`VISION.md`](VISION.md).
3.  Understand the architecture in [`ARCHITECTURE.md`](ARCHITECTURE.md).  
4.  Check the current development roadmap in [`ROADMAP.md`](ROADMAP.md).
5.  Read the contribution guidelines in [`CONTRIBUTING.md`](CONTRIBUTING.md).
6.  Browse the development log in [DEVLOG.md](DEVLOG.md) for historical context.
7.  Understand the expected behavior of AI agents in [AGENTS.md](AGENTS.md).

**For Development:**
- The project uses a Matrix-based workflow where AI agents handle GitHub operations
- AI agents operate in a containerized "jail" environment using Nix
- The bot is located in `src/morpheum-bot/` and uses local Ollama models
- Tests can be run with `bun test` (or npm if necessary)
