# OAuth Support

This document describes how Morpheum uses OAuth to authenticate LLM providers without API keys, starting with Gemini via a Google account. It also outlines the common OAuth design so OpenAI OAuth can be added later with minimal changes.

## Summary

- OAuth is supported through a loopback (localhost redirect) flow.
- Tokens are stored locally on the host machine and refreshed automatically.
- Gemini OAuth uses Google accounts (including Gmail accounts) with the Generative Language API enabled.

## Supported Providers

- Gemini (Google Generative Language API) via OAuth loopback flow.
- OpenAI OAuth is planned; the same token storage and refresh plumbing is reused.

## Gemini OAuth Setup

### 1) Create OAuth credentials

1. Create or select a Google Cloud project.
2. Enable the **Generative Language API** in the project.
3. Configure the OAuth consent screen.
4. Create an OAuth client of type **Desktop app** with redirect URI `http://127.0.0.1`.
5. Copy the Client ID and Client Secret.

### 2) Set environment variables

Set these on the host running the bot:

- `GOOGLE_OAUTH_CLIENT_ID` (required)
- `GOOGLE_OAUTH_CLIENT_SECRET` (recommended)
- `GOOGLE_OAUTH_SCOPES` (optional; space-separated list, defaults to `https://www.googleapis.com/auth/generative-language`)
- `GEMINI_MODEL` (optional; default is `gemini-3-pro-preview`)
- `GEMINI_BASE_URL` (optional; default is `https://generativelanguage.googleapis.com/v1beta`)

### 3) Start the OAuth loopback flow

In Matrix, run:

- `!llm oauth gemini start`

The bot returns an authorization URL using a loopback IP redirect (`http://127.0.0.1`). Open it, sign in with the Google account, and approve access. The loopback handler will capture the authorization code automatically.

### 4) Switch to Gemini

- `!llm switch gemini [model] [baseUrl]`

Example:

- `!llm switch gemini gemini-1.5-pro`

## OAuth Commands

- `!llm oauth gemini start` - Begin OAuth loopback flow and wait for authorization
- `!llm oauth gemini status` - Show whether a refresh token is stored and if the access token is valid
- `!llm oauth gemini revoke` - Delete stored tokens for the provider

## Token Storage

OAuth tokens are stored on the host at:

- `~/.config/morpheum/oauth.json`

This file contains refresh tokens and (if present) short-lived access tokens. Do not commit this file. Access tokens are refreshed automatically when expired.

## Scopes

Gemini OAuth uses the following scope by default for loopback flow:

- `https://www.googleapis.com/auth/generative-language`

If you are using a different Gemini backend, you may need a different scope and base URL.

## OpenAI OAuth (Planned)

The OAuth implementation is provider-agnostic. To add OpenAI OAuth later, the following will be needed:

- OpenAI OAuth client credentials
- OpenAI OAuth authorization endpoints and scopes
- Wiring the provider config into the existing OAuth manager

No API behavior changes are required beyond passing the bearer token into the OpenAI client.
