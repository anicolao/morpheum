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

At any time, a user can type `!llm status` to understand the current configuration of the room. This command clarifies which bot is active and what underlying Large Language Model (LLM) it is using.

**In a Project Room, the output is:**

```
Active Bot: @coder-bot
LLM Provider: openai-gpt4 (for role: 'developer')
Current Repository: morpheum/morpheum

Available Bots in Room:
- @coder-bot: A bot for writing and refactoring code.
  - Roles: 'developer' (uses openai-gpt4), 'reviewer' (uses claude-3-sonnet)
- @tester-bot: A bot for generating and running tests.
  - Roles: 'qa-engineer' (uses gemini-1.5-pro)
- @docs-bot: A bot for writing documentation.
  - Roles: 'tech-writer' (uses ollama/mistral-large)
```

**Key Terminology:**

*   **Bot:** An agent in the room that provides tools and capabilities. Each bot is funded and controlled by its owner.
*   **LLM Provider:** The underlying language model (e.g., OpenAI, Ollama) that provides the reasoning power for a bot.
*   The configuration is aggregated from the **bots** present in the room. Each bot owner decides which LLM providers their bot can use for specific roles.

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

## 4. Autonomous Multi-Agent Collaboration

The true power of this model emerges when specialized agents collaborate autonomously, removing the user as a bottleneck for task delegation. The user transitions from a micro-manager to a high-level approver.

**Scenario: Implementing a New Feature**

1.  **User to Planner:** The user gives a high-level objective to a planning agent.
    > **@planner-bot**, please add user authentication to our application.

2.  **Planner Bot Creates and Proposes a Plan:** The planner bot breaks down the objective, identifies the correct specialist agents for each task, and proposes an actionable plan for the user's approval.
    > **planner-bot**: Understood. I will coordinate the implementation of user authentication. Here is my plan:
    > 1.  I will assign the task "Create database schema for users" to **@db-architect**.
    > 2.  Then, I will assign the task "Implement registration and login API endpoints" to **@coder-bot**.
    > 3.  Finally, I will have **@tester-bot** write and run tests against the new endpoints.
    >
    > Do you approve this plan?

3.  **User Approves:** The user gives a simple confirmation.
    > Yes, looks good. Please proceed.

4.  **Planner Bot Orchestrates and Delegates:** The planner bot takes charge and dispatches the tasks to the specialist bots in the correct sequence.
    > **planner-bot**: Great!
    > **@db-architect**, please create the database schema for users and let me know when you are done.
    >
    > *(...later...)*
    >
    > **db-architect**: **@planner-bot**, the schema is complete.
    >
    > **planner-bot**: Thank you. **@coder-bot**, the database schema is ready. Please implement the registration and login API endpoints. Inform me upon completion.

This workflow allows for more efficient, parallelized work. The planner bot handles the dependencies and communication, freeing the user to focus on higher-level goals.

## 5. Underlying Principles

This workflow is built on a few core principles derived from the project vision and user feedback:

*   **Room-Centric Context:** All development work is scoped to a project room. The repository is an attribute of the room, not a parameter passed to a bot. This simplifies the command structure and ensures context is never ambiguous.
*   **Bot Ownership and Control:** Each user-provided bot is a distinct entity. The bot's owner is responsible for its funding and configuration, including which LLM providers it is authorized to use. By inviting their bot to a room, an owner contributes its capabilities to the project without ceding control over its operational costs.
*   **Role-Based Specialization:** A single bot can embody multiple "workers" or "roles" (e.g., a developer, a reviewer). Each role can be configured with a different system prompt and underlying LLM provider, allowing for fine-grained control over a bot's behavior and cost. These roles appear as distinct entities, making the division of labor clear.
