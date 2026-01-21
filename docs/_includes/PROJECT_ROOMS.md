# Project Rooms Design Document

## Overview

This document describes the design for a new Morpheum bot feature that allows users to create Matrix rooms corresponding to GitHub projects. The feature introduces a `!project create` command that automatically sets up a dedicated project room with GitHub Copilot integration.

## User Story

As a developer using Morpheum, I want to create dedicated Matrix rooms for specific GitHub projects so that I can collaborate with AI agents on project-specific tasks with automatic GitHub Copilot integration.

## Command Interface

### Primary Command
```
!project create git@github.com:user/projectname
```

**Alternative Formats Supported:**
```
!project create https://github.com/user/projectname
!project create https://github.com/user/projectname.git
!project create user/projectname
```

### Expected Behavior
1. Parse the Git URL to extract `user/projectname` format
2. Create a new Matrix room named `projectname`
3. Invite the requesting user to the new room
4. Configure the bot in that room to use GitHub Copilot for the specified repository
5. Send confirmation messages to both the original room and the new project room

## Architecture Components

### 1. Git URL Parser

**Purpose:** Extract repository information from various Git URL formats

**Input Formats:**
- SSH: `git@github.com:user/repo` or `git@github.com:user/repo.git`
- HTTPS: `https://github.com/user/repo` or `https://github.com/user/repo.git`
- Short: `user/repo`

**Output:** Standardized `{ owner: string, repo: string }` object

**Error Handling:**
- Invalid URL formats
- Missing or malformed repository names
- Non-GitHub URLs (future: could support other Git providers)

### 2. Room Creator Service

**Purpose:** Handle Matrix room creation and configuration

**Responsibilities:**
- Create new Matrix room with appropriate settings
- Set room name to project name
- Configure room topic with repository information
- Set appropriate room permissions and settings

**Room Configuration:**
- **Name:** Project name from repository (e.g., `morpheum`)
- **Topic:** `GitHub Project: user/projectname - Managed by Morpheum Bot`
- **Alias:** `#projectname-{timestamp}:homeserver.domain` (to avoid conflicts)
- **Visibility:** Private (invite-only)
- **History Visibility:** Shared (members can see history from when they joined)

### 3. User Invitation Service

**Purpose:** Manage user invitations to project rooms

**Process:**
1. Identify the requesting user from the original message
2. Send invitation to the new project room
3. Wait for invitation acceptance (with timeout)
4. Handle invitation failures gracefully

**Permissions:**
- Room creator: Morpheum bot (admin level)
- Invited user: Moderator level (can invite others, manage room)
- Future agents: User level (can participate but not manage)

### 4. Bot Configuration Manager

**Purpose:** Configure bot behavior per room

**Room-Specific Configuration:**
- Store repository association in room state or local storage
- Set GitHub Copilot as default LLM provider for the room
- Configure repository context for Copilot sessions
- Maintain room-to-repository mapping

**Storage Options:**
1. **Matrix Room State Events** (Recommended)
   - Store configuration in custom state events
   - Persistent across bot restarts
   - Accessible to authorized room members

### 5. Command Handler Integration

**Integration Point:** `src/morpheum-bot/bot.ts`

**New Command Handler:**
```typescript
private async handleProjectCommand(body: string, sendMessage: MessageSender, roomId: string, userId: string) {
  const parts = body.split(' ');
  const subcommand = parts[1];
  
  if (subcommand === 'create') {
    await this.handleProjectCreate(parts.slice(2), sendMessage, roomId, userId);
  } else {
    await sendMessage('Usage: !project create <git-url>');
  }
}
```

## Detailed Workflow

### Room Creation Flow

1. **Command Parsing**
   ```
   User: !project create git@github.com:facebook/react
   ```

2. **URL Validation**
   ```typescript
   const parsed = parseGitUrl("git@github.com:facebook/react");
   // Result: { owner: "facebook", repo: "react" }
   ```

3. **Room Creation**
   ```typescript
   const roomId = await matrixClient.createRoom({
     name: "react",
     topic: "GitHub Project: facebook/react - Managed by Morpheum Bot",
     visibility: "private",
     room_alias_name: `react-${timestamp}`,
     initial_state: [
       {
         type: "m.room.history_visibility",
         content: { history_visibility: "shared" }
       },
       {
         type: "dev.morpheum.project_config",
         content: {
           repository: "facebook/react",
           created_by: userId,
           created_at: new Date().toISOString()
         }
       }
     ]
   });
   ```

4. **User Invitation**
   ```typescript
   await matrixClient.inviteUser(userId, roomId);
   ```

5. **Bot Configuration**
   ```typescript
   // Switch to Copilot mode for this room
   this.roomConfigs[roomId] = {
     llmProvider: 'copilot',
     repository: 'facebook/react'
   };
   ```

6. **Confirmation Messages**
   ```
   Original Room: "✅ Project room 'react' created! You've been invited to join."
   New Room: "🚀 Welcome to the react project room! This room is configured for GitHub Copilot integration with facebook/react."
   ```

### Error Scenarios

**Invalid Git URL:**
```
User: !project create invalid-url
Bot: ❌ Invalid Git URL format. Supported formats:
     - git@github.com:user/repo
     - https://github.com/user/repo
     - user/repo
```

**Room Creation Failure:**
```
Bot: ❌ Failed to create project room. This might be due to:
     - Room name already exists
     - Insufficient permissions
     - Server connectivity issues
     Please try again or contact an administrator.
```

**Invitation Failure:**
```
Bot: ✅ Project room 'react' created, but failed to invite you.
     Please join manually: #react-{timestamp}:matrix.server.com
```

**GitHub Repository Access:**
```
Bot: ⚠️  Room created successfully, but unable to verify GitHub repository access.
     Please ensure the repository exists and is accessible.
```

## Security Considerations

### Authentication & Authorization

**Who Can Create Project Rooms:**
- Initially: Any authenticated Matrix user in rooms where the bot is present
- Future: Configurable per-server or per-room permissions

**Repository Access Validation:**
- Verify GitHub repository exists and is accessible
- Check if bot has necessary permissions for Copilot integration
- Warn users if repository is private and bot lacks access

**Room Security:**
- All project rooms are private (invite-only)
- Room creator gets moderator permissions
- Bot maintains admin permissions for management

### Rate Limiting

**Anti-Abuse Measures:**
- Limit room creation to 1 per user per 5 minutes
- Maximum 100 project rooms per user total
- Server-wide limits to prevent spam

**Implementation:**
```typescript
interface RateLimitState {
  userId: string;
  lastCreation: Date;
  totalRooms: number;
}
```

### Data Privacy

**Information Storage:**
- Repository URLs are stored in Matrix room state (visible to room members)
- No sensitive GitHub credentials stored in room state
- Bot uses its own GitHub token for API access

**Access Control:**
- Room configuration only accessible to room members
- Historical messages follow Matrix room history visibility settings

## Integration Points

### Matrix Bot SDK Extensions

**Required Capabilities:**
- Room creation with custom state events
- User invitation management
- Room-specific bot configuration
- Event listeners for room membership changes

**New Dependencies:**
- No additional dependencies required
- Leverage existing `matrix-bot-sdk` capabilities

### GitHub Copilot Integration

**Enhanced Room Context:**
```typescript
interface ProjectRoomConfig {
  repository: string;
  llmProvider: 'copilot';
  copilotConfig: {
    baseUrl?: string;
    pollInterval?: number;
  };
}
```

**Per-Room LLM Client:**
- Maintain separate LLM client instances per room
- Automatic context switching based on room configuration
- Preserve existing global bot configuration for non-project rooms

### Configuration Management

**Environment Variables:**
```bash
# Optional: Restrict project room creation
PROJECT_ROOMS_ENABLED=true
PROJECT_ROOMS_MAX_PER_USER=100
PROJECT_ROOMS_RATE_LIMIT_MINUTES=5

# Optional: Default room settings
PROJECT_ROOMS_HISTORY_VISIBILITY=shared
PROJECT_ROOMS_DEFAULT_POWER_LEVEL=50
```

**Room State Schema:**
```json
{
  "type": "dev.morpheum.project_config",
  "content": {
    "repository": "owner/repo",
    "created_by": "@user:server.com",
    "created_at": "2024-01-15T10:30:00Z",
    "llm_provider": "copilot",
    "version": "1.0"
  }
}
```

## User Experience

### Success Flow

1. **User initiates creation:**
   ```
   User: !project create git@github.com:vercel/next.js
   ```

2. **Bot provides immediate feedback:**
   ```
   Bot: 🔨 Creating project room for next.js...
   ```

3. **Room creation confirmation:**
   ```
   Bot: ✅ Project room 'next.js' created successfully!
        📧 Invitation sent - please check your Matrix client
        🔗 Room: #next-js-1642248600:matrix.morpheum.dev
   ```

4. **User joins new room:**
   ```
   Bot (in new room): 🚀 Welcome to the next.js project room!
                      
                      This room is configured for:
                      📂 Repository: vercel/next.js
                      🤖 AI Provider: GitHub Copilot
                      
                      You can now collaborate on this project with AI assistance.
                      Try asking: "Show me the latest issues" or "Help me implement a new feature"
   ```

### Help and Discovery

**Enhanced Help Command:**
```
!help
...existing commands...
- `!project create <git-url>` - Create a new project room for a GitHub repository
- `!project list` - List your project rooms (future enhancement)
- `!project leave <room-name>` - Leave a project room (future enhancement)
```

**Project-Specific Help:**
```
!project help

🏗️  **Project Room Management**

**Create a project room:**
`!project create <git-url>`

**Supported URL formats:**
- SSH: git@github.com:user/repo
- HTTPS: https://github.com/user/repo
- Short: user/repo

**Examples:**
- `!project create git@github.com:facebook/react`
- `!project create https://github.com/vercel/next.js`
- `!project create microsoft/vscode`

**Features:**
✅ Automatic GitHub Copilot integration
✅ Private invite-only rooms
✅ Project-specific AI context
✅ Persistent configuration
```

## Future Enhancements

### Phase 2: Room Management
- `!project list` - List user's project rooms
- `!project invite <user> <room>` - Invite others to project rooms
- `!project leave <room>` - Leave a project room
- `!project archive <room>` - Archive completed projects

### Phase 3: Advanced Features
- Multi-repository support per room
- Integration with GitHub webhooks for real-time updates
- Project templates and room customization
- Cross-room project linking and dependencies

## Implementation Plan

### Phase 1: Core Implementation (Week 1-2)
1. **Git URL Parser** - Parse various Git URL formats
2. **Basic Room Creation** - Create rooms with proper configuration
3. **User Invitation** - Invite requesting user to new room
4. **Command Integration** - Add `!project create` to bot commands
5. **Basic Error Handling** - Handle common failure scenarios

### Phase 2: Enhanced Integration (Week 3)
1. **Copilot Configuration** - Per-room Copilot setup
2. **Room State Management** - Persistent configuration storage
3. **Security Features** - Rate limiting and access controls
4. **Improved UX** - Better error messages and help text

### Phase 3: Production Readiness (Week 4)
1. **Comprehensive Testing** - Unit and integration tests
2. **Performance Optimization** - Efficient room management
3. **Documentation** - User guides and API documentation
4. **Monitoring** - Logging and metrics collection

## Success Metrics

**Functionality Metrics:**
- Successful room creation rate (target: >95%)
- User invitation success rate (target: >90%)
- Copilot integration activation rate (target: >95%)

**User Experience Metrics:**
- Time to room creation (target: <10 seconds)
- User adoption of project rooms (track creation frequency)
- Error rate and user feedback quality

**Technical Metrics:**
- Room management overhead (memory/storage usage)
- API response times for GitHub integration
- Bot performance impact in multi-room scenarios

## Conclusion

The Project Rooms feature will significantly enhance Morpheum's collaborative capabilities by providing dedicated spaces for GitHub project work with automatic AI integration. The design balances user experience, security, and technical implementation while maintaining consistency with Morpheum's existing architecture.

This feature leverages Morpheum's core strengths:
- Matrix-based communication and collaboration
- GitHub integration and workflow automation  
- AI-powered development assistance
- Flexible and extensible architecture

The implementation will create a seamless bridge between GitHub repositories and Matrix collaboration spaces, enabling more focused and productive development workflows with integrated AI assistance.