# Multi-Identity Matrix Bots Design Proposal

**Status**: Draft
**Type**: Feature Enhancement
**Owner**: Morpheum maintainers
**Target Phase**: Morpheum v0.3

## Quick Summary

Generalize the Matrix bot to run multiple Matrix identities in one process, each with its own prompt/personality and optional LLM configuration. Delegation happens in the main chat room via @mentions, with prompts and per-bot configuration determining when to delegate and how to respond or reject requests.

## Problem Statement

Today the bot runs as a single Matrix identity with a single prompt and a single runtime configuration:

- `src/morpheum-bot/index.ts` creates exactly one `MatrixClient` and one `MorpheumBot` instance.
- `src/morpheum-bot/prompts.ts` exposes a single `SYSTEM_PROMPT` used by `SWEAgent` in `src/morpheum-bot/sweAgent.ts`.
- `bot.json` is a single storage file for the Matrix sync state.

This makes it hard to:

- Run multiple Matrix identities (for specialized roles or isolated access).
- Provide different system prompts/personalities per bot.
- Delegate tasks between bots and route responses back to the origin.
- Scale responsibilities without running multiple processes.

## Goals

- Support multiple Matrix logins in one process.
- Allow per-bot prompts/personalities and optional per-bot LLM config.
- Enable bot-to-bot delegation in the main room using @mentions, with prompts controlling acceptance/rejection.
- Maintain a simple migration path from the current single-bot setup.

## Non-Goals

- Multi-process orchestration or external job queues.
- Replacing the existing command surface; new commands should be additive.
- Building a full agent marketplace or complex negotiation system.

## Proposed Solution

### 1) Identity Registry and Runtime Manager

Introduce a `BotManager` that loads a multi-identity configuration file and instantiates one `MatrixClient` + `MorpheumBot` per identity.

New config file (example):

```json
{
  "defaults": {
    "llm": { "provider": "ollama", "model": "morpheum-local" },
    "prompt": "prompts/morpheum.md"
  },
  "bots": [
    {
      "id": "morpheum",
      "displayName": "Morpheum",
      "matrix": {
        "homeserverUrl": "https://matrix.example.org",
        "accessToken": "${ACCESS_TOKEN_MORPHEUM}",
        "storagePath": "bot.morpheum.json"
      }
    },
    {
      "id": "product",
      "displayName": "Product",
      "matrix": {
        "homeserverUrl": "https://matrix.example.org",
        "accessToken": "${ACCESS_TOKEN_PRODUCT}",
        "storagePath": "bot.product.json"
      },
      "prompt": "prompts/product.md"
    }
  ]
}
```

Notes:

- `storagePath` prevents multiple identities from sharing a single `bot.json` sync state.
- Values support environment variable expansion for secrets.
- The current env var flow remains supported by generating an implicit single-bot config if the config file is absent.

### 2) Persona-Aware Bot Construction

Refactor `MorpheumBot` to accept a `BotPersona` object:

- `personaId` and `displayName` for logging and routing.
- `systemPrompt` loaded from file (defaults to current `SYSTEM_PROMPT`).
- Optional `llm` overrides for provider/model/base URL.

`SWEAgent` should accept a prompt string (or prompt factory) instead of importing the single `SYSTEM_PROMPT` directly, enabling per-identity prompts.

### 3) Delegation via Shared-Room Mentions

All communication (human ↔ bot and bot ↔ bot) happens in the main chat room. Delegation is performed by the requesting bot mentioning the target bot in that room. It is up to the requesting bot’s prompt to decide *who* to ask, and up to the target bot’s prompt/config to decide whether to accept, respond, or reject the request.

Recommended conventions:

- **Request format**: `@reviewer Request: <task> (from @morpheum, id: <task-id>)`
- **Response format**: `@morpheum Response (id: <task-id>): <result>` or `@morpheum Reject (id: <task-id>): <reason>`
- **Loop control**: Bots only act on messages that explicitly mention them and include a recognized request prefix. Prompts should discourage re-delegating delegated tasks unless explicitly asked by a human.

### 4) Command Surface

Delegation does not require new commands because it is driven by @mentions in the main room. Minimal visibility commands remain useful:

- `!bot list` - List available local identities and their roles.
- `!bot whoami` - Show the current bot identity.

Optional helper command:

- `!bot request @<bot-id> <task>` - Post a formatted delegation request into the room.

### 5) Message Handling Flow

1. A user requests a task in the main room.
2. Bot X decides to delegate and posts a request mentioning Bot Y in the same room.
3. Bot Y decides whether to accept based on its prompt/config and replies in the same room, mentioning Bot X.
4. Bot X relays or incorporates the response for the user (or the response stands on its own if addressed to the user).

### 6) Observability and Audit Trail

- Add structured logging fields: `botId`, `taskId`, `originRoomId`, `targetBotId`, `hopCount`.
- Include a short attribution line in delegated responses (ex: "Delegated to reviewer bot").

## Data Model Changes

New interfaces (conceptual):

```ts
interface BotPersonaConfig {
  id: string;
  displayName?: string;
  prompt?: string;
  llm?: { provider?: string; model?: string; baseUrl?: string };
  matrix: {
    homeserverUrl: string;
    accessToken?: string;
    username?: string;
    password?: string;
    storagePath: string;
  };
}
```

Delegation is represented as structured text in the main room rather than a custom envelope. We standardize a request/response prefix and include a lightweight `task-id` for traceability.

## Implementation Plan

1. Add a config loader and `BotManager` to spawn multiple `MatrixClient` instances.
2. Update `MorpheumBot` and `SWEAgent` to accept a prompt and persona configuration.
3. Add mention-based delegation detection and request/response formatting helpers.
4. Implement the `!bot` visibility commands and optional request helper.
5. Add tests for config parsing, mention routing, and loop prevention rules.
6. Document the new configuration in the README and create a Jekyll proposal page.

## Alternatives Considered

- **Multiple processes per identity**: simple operationally, but harder to coordinate and increases resource usage.
- **Single identity with role switching**: keeps one login, but breaks expectations for persona isolation and access control.

## Impact and Risks

- **Token refresh complexity**: each identity needs its own `TokenManager` and refresh lifecycle.
- **Noise in shared rooms**: multiple bots responding in the same room can create chatter without clear mention-based gating.
- **Message loops**: prompts should discourage re-delegating delegated tasks; request/response prefixes help.
- **Performance**: multiple Matrix clients will increase memory and sync load; storage paths must be unique.

## Open Questions

- What request/response prefixes should be considered official for delegation parsing?
- Should bots ignore delegation requests unless they include a task-id?
- Should bots maintain a denylist/allowlist of other bots they will accept requests from?

## Success Criteria

- Multiple identities can run in a single process and respond independently.
- Delegated tasks complete and return responses to the origin without loops.
- Personas can be configured per identity with custom prompts and LLM settings.
- Existing single-bot deployments work without config changes.
