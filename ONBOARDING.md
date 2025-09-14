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
   - Go to [element.io](https://element.io) and hover over "Sign in" and click on "Open element web"
   - Choose "Create Account" and sign up on the matrix.org homeserver
   - Pick a username like `@yourname:matrix.org`

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
1. In Element, go to Settings → Encryption
2. Click "Setup Recovery Key"
3. **Save this key securely** - store it in a password manager

### Cross-Signing
1. Enable cross-signing when prompted
2. This allows you to verify your other devices
3. Accept the security key setup that appears

## Step 3: Verify Inviter Profile

When someone invites you to the Morpheum Matrix rooms:

### Verification Process
1. Check the inviter's Matrix ID (e.g., `@username:morpheum.dev`)
2. Click the user's profile picture and click "Verify user" to start the verification process
3. If unsure, ask in a separate, verified channel

## Step 4: Join Project Rooms

### Main Project Room
1. Accept the invitation to the main Morpheum project room
2. Introduce yourself briefly: mention your background and what you'd like to contribute
3. Try typing `!help` to see available commands

## Step 5: Development Environment Setup

### Prerequisites: Install Development Tools

Morpheum uses **direnv** and **Nix** to automatically set up your development environment with all required tools and secrets when you enter the project directory.

#### Install Nix
1. **Install Nix** (the package manager):
   ```bash
   # On Linux/macOS
   curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
   ```
   - Follow the installer prompts and restart your shell when complete

#### Install direnv
2. **Install direnv** (environment manager):
   ```bash
   # On macOS with Homebrew
   brew install direnv
   
   # On Ubuntu/Debian
   sudo apt install direnv
   
   # On other systems, see: https://direnv.net/docs/installation.html
   ```

3. **Set up direnv shell integration**:
   ```bash
   # For bash, add to ~/.bashrc:
   echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
   
   # For zsh, add to ~/.zshrc:
   echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
   
   # Restart your shell or source the config file
   ```

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anicolao/morpheum.git
   cd morpheum
   ```

2. **Set up environment secrets:**
   
   When you first enter the directory, direnv will prompt you to allow the environment. This is expected:
   ```bash
   # You'll see: direnv: error .envrc is blocked. Run `direnv allow` to approve its content
   ```
   
   Before allowing direnv, create your secrets file:
   ```bash
   # Create .secrets file with your Matrix and GitHub credentials
   cp << 'EOF' > .secrets
   # Matrix Bot Configuration
   export HOMESERVER_URL="https://matrix.org"
   export MATRIX_USERNAME="your-bot-username"
   export MATRIX_PASSWORD="your-bot-password"
   # Or alternatively use an access token:
   # export ACCESS_TOKEN="your-matrix-access-token"

   # GitHub Configuration (optional, for advanced bot features)
   export GITHUB_TOKEN="your-github-personal-access-token"

   # Registration tokens for different homeservers (if registering bots)
   # export REGISTRATION_TOKEN_MATRIX_ORG="your-registration-token"
   EOF
   ```
   
   **Edit the `.secrets` file** with your actual credentials:
   - Matrix username/password or access token from your Matrix account
   - GitHub personal access token (optional, but recommended for full functionality)

3. **Allow direnv and activate environment:**
   ```bash
   direnv allow
   ```
   
   This will:
   - Automatically install `bun`, `ollama`, and other required tools via Nix
   - Load your secrets as environment variables
   - Set up the complete development environment

4. **Install project dependencies:**
   ```bash
   bun install  # now available via Nix
   ```

5. **Run tests:**
   ```bash
   bun test
   ```

### Understanding the Codebase
- **Main bot code**: `src/morpheum-bot/`
- **Documentation**: `docs/` (Jekyll-based site)
- **Tests**: Throughout the codebase with `.test.ts` extensions
- **Configuration**: `package.json`, `tsconfig.json`, `vitest.config.ts`

## Step 6: Contributing to the Project

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