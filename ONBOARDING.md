# Developer Onboarding Guide

Welcome to the Morpheum project! This guide will help you get set up as a new developer and understand how to participate in our Matrix-based collaborative development environment.

## Quick Overview

Morpheum is a collaborative platform where AI agents and humans work together on software development projects. All team communication happens through **Matrix chat rooms**, while code is managed through **GitHub**. The project focuses on seamless AI-human collaboration with Matrix as the primary interface.

## Prerequisites

Before you begin, make sure you have:
- A GitHub account
- Basic understanding of Git and GitHub workflows
- Willingness to learn Matrix chat protocol (it's easy!)

## Step 1: Create a Matrix Account

Matrix is a decentralized, secure messaging protocol that serves as our primary communication platform.

### Account Creation Options

1. **Use an existing homeserver** (recommended for quick start):
   - Go to [element.io](https://element.io) and click "Get started"
   - Choose "Create Account" and sign up on the matrix.org homeserver
   - Pick a username like `@yourname:matrix.org`

2. **Join our Morpheum homeserver** (for team members):
   - Use `morpheum.dev` as your homeserver when creating an account
   - Your username will be `@yourname:morpheum.dev`
   - Contact the team for a registration token if needed

### Installing a Matrix Client

**Desktop/Web:**
- **Element** (recommended): [element.io](https://element.io)
- **FluffyChat**: Available on most platforms
- **Nheko**: Lightweight desktop client

**Mobile:**
- **Element** (iOS/Android)
- **FluffyChat** (iOS/Android)
- **SchildiChat** (Android)

## Step 2: Set Up Account Recovery

**Important**: Matrix uses end-to-end encryption, so setting up recovery is crucial to avoid losing access to your messages.

### Security Key Setup
1. In Element, go to Settings → Security & Privacy
2. Set up "Secure Backup" with a security key
3. **Save this key securely** - store it in a password manager
4. Alternatively, set up a security phrase (easier to remember)

### Recovery Passphrase
1. Choose a strong passphrase you can remember
2. Write it down and store it securely
3. This will help you recover your account if you lose device access

### Cross-Signing
1. Enable cross-signing when prompted
2. This allows you to verify your other devices
3. Accept the security key setup that appears

## Step 3: Verify Inviter Profile

When someone invites you to the Morpheum Matrix rooms:

### Verification Process
1. Check the inviter's Matrix ID (e.g., `@username:morpheum.dev`)
2. Verify their identity through existing communication channels
3. Look for the green verification checkmark in Element
4. If unsure, ask in a separate, verified channel

### Team Member Verification
- Core team members will have `@name:morpheum.dev` addresses
- Check the [project documentation](https://anicolao.github.io/morpheum/) for team member listings
- When in doubt, ask for verification through GitHub or other known channels

## Step 4: Join Project Rooms and Invite the Bot

### Main Project Room
1. Accept the invitation to the main Morpheum project room
2. Introduce yourself briefly: mention your background and what you'd like to contribute

### Invite the Morpheum Bot
1. In the room, type: `/invite @morpheum-bot:morpheum.dev`
2. The bot should join and send a welcome message
3. Try typing `!help` to see available commands

## Step 5: Troubleshooting Bot Issues

### Problem: Bot Not Responding to Messages

If the bot doesn't respond to your commands, try these solutions:

**Check Bot Presence:**
- Verify the bot is in the room (look for `@morpheum-bot:morpheum.dev` in member list)
- If not present, try inviting again: `/invite @morpheum-bot:morpheum.dev`

**Test Basic Commands:**
```
!help          # Should show available commands
!ping          # Should get a pong response
```

**Common Issues:**
1. **Bot is offline**: Contact team admins to restart the bot service
2. **Permissions**: The bot might need admin permissions in the room
3. **Room encryption**: Some bot features may not work in encrypted rooms
4. **Network issues**: The bot's homeserver might be experiencing connectivity problems

**Advanced Troubleshooting:**
- Check the bot's status in the main room
- Look for error messages in bot logs (if you have access)
- Try creating a new test room and inviting the bot there

### Getting Help
- Ask in the main Morpheum Matrix room
- Create a GitHub issue for persistent problems
- Check the project documentation at [morpheum.dev](https://anicolao.github.io/morpheum/)

## Step 6: Development Environment Setup

### Local Development
1. **Clone the repository:**
   ```bash
   git clone https://github.com/anicolao/morpheum.git
   cd morpheum
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install  # preferred
   ```

3. **Run tests:**
   ```bash
   npm test
   # or
   bun test
   ```

### Understanding the Codebase
- **Main bot code**: `src/morpheum-bot/`
- **Documentation**: `docs/` (Jekyll-based site)
- **Tests**: Throughout the codebase with `.test.ts` extensions
- **Configuration**: `package.json`, `tsconfig.json`, `vitest.config.ts`

## Step 7: Contributing to the Project

### Matrix-First Workflow
Morpheum uses a unique Matrix-centric development workflow:

1. **Discuss in Matrix**: All development discussions happen in project rooms
2. **AI Agent Assistance**: AI agents help with code changes based on Matrix instructions
3. **GitHub Integration**: Code changes are managed through GitHub PRs
4. **Review Process**: Human oversight ensures quality and direction

### Making Your First Contribution
1. **Join discussions** in the main project room
2. **Read existing documentation**:
   - [VISION.md](VISION.md) - Project philosophy
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Technical overview
   - [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
   - [ROADMAP.md](ROADMAP.md) - Current development priorities

3. **Find a task**:
   - Check the [task board](https://anicolao.github.io/morpheum/status/tasks/)
   - Look at GitHub issues
   - Ask in Matrix what needs help

4. **Work with AI agents**:
   - Describe desired changes in Matrix
   - AI agents will create branches and PRs
   - Review and iterate based on feedback

### Directory-Based Documentation
The project uses a directory-based system to avoid merge conflicts:

- **Tasks**: Create new files in `docs/_tasks/` instead of editing `TASKS.md`
- **Dev logs**: Create new files in `docs/_devlogs/` instead of editing `DEVLOG.md`
- **Follow YAML frontmatter format** for automatic aggregation

## Step 8: Project-Specific Commands

### Bot Commands
Once the bot is working, you can use these commands:

```
!help              # Show available commands
!project create    # Create a project-specific room (with GitHub URL)
!openai            # Direct OpenAI interaction
!copilot          # GitHub Copilot integration
!gauntlet         # Advanced testing framework
```

### Creating Project Rooms
For specific GitHub projects:
```
!project create https://github.com/user/repo
!project create git@github.com:user/repo.git
!project create user/repo
```

This creates a dedicated Matrix room for that project with Copilot integration.

## Important Resources

### Documentation
- **Project Website**: [morpheum.dev](https://anicolao.github.io/morpheum/)
- **Task Board**: [Status/Tasks](https://anicolao.github.io/morpheum/status/tasks/)
- **Development Logs**: [Status/DevLogs](https://anicolao.github.io/morpheum/status/devlogs/)
- **GitHub Repository**: [anicolao/morpheum](https://github.com/anicolao/morpheum)

### Key Files to Read
- [VISION.md](VISION.md) - Project goals and philosophy
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [AGENTS.md](AGENTS.md) - AI agent guidelines
- [MATRIX_SETUP.md](MATRIX_SETUP.md) - Advanced Matrix server setup

### Getting Support
- **Matrix Room**: Main project room (after you join)
- **GitHub Issues**: For bugs and feature requests
- **Documentation**: Check the Jekyll site first

## Security and Best Practices

### Matrix Security
- Always verify device keys when prompted
- Use cross-signing for device verification
- Keep your recovery key/phrase secure
- Be cautious about encrypted room invitations from unknown users

### Development Security
- Never commit secrets to the repository
- Use environment variables for sensitive data
- Follow the project's security guidelines in CONTRIBUTING.md

### Communication Etiquette
- Be respectful and constructive in all communications
- Use threading for long discussions in busy rooms
- Check existing documentation before asking questions
- Help others who are also onboarding

## Next Steps

1. **Complete all setup steps above**
2. **Introduce yourself** in the main Matrix room
3. **Read the key documentation** (VISION, ARCHITECTURE, CONTRIBUTING)
4. **Explore the codebase** and run tests locally
5. **Find a small task** to start contributing
6. **Ask questions** - the team is here to help!

Welcome to Morpheum! We're excited to have you as part of our collaborative AI-human development community.

---

*This document is part of the Morpheum project documentation. For updates and more information, visit [morpheum.dev](https://anicolao.github.io/morpheum/).*