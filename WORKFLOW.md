# User Workflow for Collaborative Development

## 1. Introduction

This document outlines the intended user workflow for interacting with the Morpheum development environment. It is guided by the principles in `VISION.md`, focusing on creating a seamless, collaborative space where humans and AI agents work together on software projects within a Matrix chat room.

The primary goal is to define the user experience *before* diving into a specific implementation. We will first describe the "happy path" for a user who joins a project room to get work done. Workflows for creating rooms, inviting bots, and configuring bots will be addressed separately.

## 2. The Project Room: A User's Perspective

The central hub for any project is a **Project Room** in Matrix. A user's journey begins when they join one of these rooms.

### 2.1. Entering a Room and Gaining Context

When a user enters a project room, the environment provides immediate context:

*   **Room Name & Topic:** The room's name (e.g., `morpheum-dev`) and topic clearly state the associated GitHub repository (e.g., `GitHub Project: morpheum/morpheum`).
*   **Welcome Message:** A bot greets the user, confirming the project context and listing the available AI agents and their specializations.

### 2.2. Understanding the Environment with `!llm status`

At any time, a user can type `!llm status` to understand the current configuration of the room. This command is crucial for orienting the user.

**In a Project Room, the output is:**

```
Current Provider: @coder-bot (using openai-gpt4)
Current Repository: morpheum/morpheum

Available Providers:
- @coder-bot: A bot for writing and refactoring code.
  - Roles: 'developer' (openai-gpt4), 'reviewer' (claude-3-sonnet)
- @tester-bot: A bot for generating and running tests.
  - Roles: 'qa-engineer' (gemini-1.5-pro)
- @docs-bot: A bot for writing documentation.
  - Roles: 'tech-writer' (ollama/mistral-large)
```

**Key Changes from Previous Design:**

*   The focus is on the **current active provider** and the **room's repository**.
*   The concept of "Global Configuration" is removed. Configuration is aggregated from the bots present in the room.
*   "Available Providers" lists the bots and the roles/models they offer, reflecting that each bot owner controls their own configuration.

**In a non-project room (e.g., a general lobby), the output is:**

```
Non-project room. Switch to a project to do development work.
```

This enforces the principle that all development work must happen within the context of a project room, which is always tied to a repository.

## 3. The Core Interaction Loop

The workflow for getting work done is designed to be conversational and intuitive.

1.  **Assigning a Task:** The user assigns a task by addressing a specific bot by its name. Each bot is a distinct user in the room.

    > **@coder-bot**, please implement the `!llm status` command as described in `WORKFLOW.md`.

2.  **Bot Acknowledges and Executes:** The bot acknowledges the request and begins work. It has access to the room's repository and can use its configured tools (e.g., file system access, shell commands).

    > **coder-bot**: Understood. I will now implement the `!llm status` command. I'll start by reading the relevant files to understand the current implementation.

3.  **Progress Updates:** The bot provides clear, concise updates on its progress.

4.  **Completion:** Once finished, the bot announces the completion and awaits further instructions or a code review.

## 4. Multi-Agent Collaboration

The true power of this model emerges when multiple specialized agents collaborate. The user acts as the orchestrator.

**Scenario: Implementing a New Feature**

1.  **User to Planner:**
    > **@planner-bot**, break down the task "add user authentication".

2.  **Planner Bot Responds:**
    > **planner-bot**: Here is the breakdown:
    > 1. Create database schema for users. (`@db-architect`)
    > 2. Implement registration and login API endpoints. (`@coder-bot`)
    > 3. Write unit and integration tests for the new endpoints. (`@tester-bot`)
    > 4. Update the user documentation. (`@docs-bot`)

3.  **User Delegates to Specialists:**
    > **@coder-bot**, please handle task 2.
    > **@tester-bot**, once the endpoints are ready, please handle task 3.

This workflow allows for parallelization and leverages the unique strengths of each agent, mirroring a human development team.

## 5. Underlying Principles

This workflow is built on a few core principles derived from the project vision and user feedback:

*   **Room-Centric Context:** All development work is scoped to a project room. The repository is an attribute of the room, not a parameter passed to a bot. This simplifies the command structure and ensures context is never ambiguous.
*   **Provider Ownership and Control:** Each bot owner configures their own bot's available LLMs and roles. By inviting their bot to a room, they are *contributing* its capabilities to the project. The room aggregates these capabilities but cannot force a bot to use a model (and associated cost) that its owner has not authorized. This directly addresses the need for budget control.
*   **Role-Based Specialization:** A single bot can embody multiple "workers" or "roles" (e.g., a developer, a reviewer). Each role can be configured with a different model or system prompt, allowing for fine-grained control over a bot's behavior and cost. These roles appear as distinct entities, making the division of labor clear to the user.
