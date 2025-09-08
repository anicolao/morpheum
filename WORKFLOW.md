# Morpheum Workflow: Human-Bot Collaboration in Matrix Rooms

## Overview

This document outlines the intended workflow for users participating in Morpheum project rooms where humans and AI bots collaborate on software development tasks. The focus is on the user experience of working with multiple bots that have different capabilities, roles, and funding models.

## Core Concepts

### Room as Organizing Container
- A Matrix room serves as the central collaboration space for a project.
- The room is associated with a specific GitHub repository (configured via `PROJECT_ROOMS.md`).
- Multiple bots can be present in the room, each contributing different AI capabilities.
- All bots in the room are aware of the project context and repository.

### Bot Ownership and Funding Model
- Each bot is owned and funded by a specific person.
- Bot owners maintain control over their bot's configuration (models, costs, capabilities).
- Bot owners contribute their bot's compute resources and AI capabilities to the project.
- Bot owners cannot be forced to use expensive models by other room participants.

### Bot Roles and Identities
- Each bot can fulfill multiple roles through different system prompts.
- Each role appears as a separate user identity in the chat room.
- Roles are defined and configured by the bot owner.
- Examples of roles: code reviewer, documentation writer, test generator, project manager.

## User Workflow: Participating in a Project Room

### 1. Joining a Project Room

**User Journey:**
1. A user receives an invitation to a project room or discovers an existing one.
2. The user joins the room and sees:
    - The room topic indicating the associated GitHub repository.
    - A welcome message listing the active bots and their available roles.
3. The user can request the current status to understand the environment.

**Example Room Entry Experience:**
```
Welcome to the MyProject room!
📂 Repository: user/myproject
🤖 Available Bots:
  - Alice's Bot: @reviewer, @coder, @tester
  - Bob's Bot: @docs-writer, @architect
  - Carol's Bot: @pm, @qa

Type !help to see available commands.
Type !status to see detailed bot capabilities.
```

### 2. Understanding the Environment with `!status`

At any time, a user can type `!status` to understand the current configuration of the room. This command clarifies which bot is active and what underlying Large Language Model (LLM) it is using.

**In a Project Room, the output is:**
```
Active Bot: @coder-bot
LLM Provider: openai-gpt4 (for role: 'developer')
Current Repository: morpheum/morpheum

Available Bots in Room:
- @coder-bot (Owner: @alice:matrix.org): A bot for writing and refactoring code.
  - Roles: 'developer' (uses openai-gpt4), 'reviewer' (uses claude-3-sonnet)
- @tester-bot (Owner: @alice:matrix.org): A bot for generating and running tests.
  - Roles: 'qa-engineer' (uses gemini-1.5-pro)
- @docs-bot (Owner: @bob:matrix.org): A bot for writing documentation.
  - Roles: 'tech-writer' (uses ollama/mistral-large)
```

**In a non-project room (e.g., a general lobby), the output is:**
```
Non-project room. Switch to a project to do development work.
```

### 3. Requesting Work from Bots

**Direct Bot Interaction:**
Users can address specific bot roles directly to request work:
```
User: @reviewer please review the authentication module in src/auth/

User: @coder can you implement the user registration endpoint based on the spec in docs/api.md?
```

**Broadcast Requests:**
Users can make general requests that any appropriate bot can respond to:
```
User: Can someone help me debug this test failure?

User: Who can review my pull request #123?
```

### 4. Bot-to-Bot Collaboration

#### Automatic Coordination
Bots can see each other's public messages and coordinate simple workflows:
```
@coder: I've implemented the user registration endpoint. @tester, can you generate tests for this?

@tester: Tests generated! @reviewer, the code and tests are ready for review.
```

#### Planner-Led Delegation
For more complex tasks, a user can engage a planner bot which then orchestrates other bots, subject to user approval. This makes the user a high-level approver rather than a micro-manager.

1.  **User to Planner:** The user gives a high-level objective.
    > **@planner-bot**, please add user authentication to our application.

2.  **Planner Bot Creates and Proposes a Plan:** The planner proposes an actionable plan for the user's approval.
    > **planner-bot**: Understood. Here is my plan:
    > 1.  I will assign the task "Create database schema" to **@db-architect**.
    > 2.  Then, I will assign "Implement API endpoints" to **@coder-bot**.
    > 3.  Finally, I will have **@tester-bot** write and run tests.
    >
    > Do you approve this plan?

3.  **User Approves:**
    > Yes, looks good. Please proceed.

4.  **Planner Bot Orchestrates and Delegates:**
    > **planner-bot**: Great! **@db-architect**, please create the database schema for users and let me know when you are done.

### 5. Understanding Work Status and Progress

**Status Commands:**
- `!tasks` - List open tasks and their assignments.
- `!progress` - Show recent progress and completed work.

**Example Status Display:**
```
User: !tasks
Bot Response:
📊 **Active Work:**
- @coder: Implementing user authentication (PR #125)
- @reviewer: Reviewing database optimization (PR #124)
- @docs-writer: Updating API documentation

**Pending Tasks:**
- Test coverage for payment module
- Security audit of authentication flow
```

### 6. Managing Work Priorities and Direction

Users can provide high-level direction and priorities to the bots:
```
User: @pm the authentication feature is our top priority. Please coordinate with the team to get this done first.

User: @coder pause the optimization work, we have a critical bug that needs immediate attention.
```

When bots need human input, they will escalate:
```
@architect: I need a decision on the database choice for the new feature. PostgreSQL vs MongoDB pros/cons attached.
```

## Communication Patterns

### Bot Identification and Addressing
- Each bot role has a unique `@username` that users can address directly.
- Users can use `@all` to address all bots.
- Users can use `@role-type` (e.g., `@reviewers`) to address all bots of a certain type.

### Work Request Formats
- **Task Assignment:** "@role please [specific task]"
- **Question:** "@role can you help me with [problem]?"
- **Review Request:** "@role please review [item/PR/code]"

## Bot Capability Framework

### Categories of Bot Capabilities
1.  **Code Generation** - Writing new code, implementing features
2.  **Code Review** - Analyzing code quality, security, best practices
3.  **Testing** - Generating tests, running test suites, validation
4.  **Documentation** - Writing docs, READMEs, API documentation
5.  **Project Management** - Task breakdown, planning, coordination
6.  **Architecture** - System design, technical decisions, patterns
7.  **Quality Assurance** - Testing strategy, quality gates, validation

## Future Considerations

### Bot Marketplace and Discovery
- Users could discover and invite additional bots to rooms.
- Bot owners could advertise their bot capabilities.
- Quality ratings and feedback for bot performance.

### Advanced Coordination
- Bots could form temporary teams for complex tasks.
- Automatic work distribution based on bot capabilities.
- Learning from collaboration patterns to improve coordination.

### Economic Models
- Token-based payment systems for expensive AI usage.
- Revenue sharing for bot contributions.
- Incentives for contributing specialized bot capabilities.

---
This workflow prioritizes user experience and natural collaboration while respecting the constraints of bot ownership and funding models. The focus is on making it easy for users to get work done while maintaining clear boundaries around bot control and capabilities.
