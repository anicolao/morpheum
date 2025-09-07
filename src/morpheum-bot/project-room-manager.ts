/**
 * Project Room Manager - Handle creation and configuration of project-specific Matrix rooms
 */

import { MatrixClient } from 'matrix-bot-sdk';
import { parseGitUrl, GitUrlInfo, GitUrlParseError } from './git-url-parser';

export interface ProjectRoomConfig {
  repository: string;
  llmProvider: 'copilot';
  created_by: string;
  created_at: string;
  version: string;
}

export interface ProjectRoomCreationResult {
  success: boolean;
  roomId?: string;
  projectName?: string;
  error?: string;
}

export interface ProjectRoomInvitationResult {
  success: boolean;
  error?: string;
}

export class ProjectRoomManager {
  constructor(private matrixClient: MatrixClient) {}

  /**
   * Create a new project room for a GitHub repository
   * 
   * @param gitUrl - The Git URL to create a room for
   * @param creatorUserId - The Matrix user ID who is creating the room
   * @returns Promise<ProjectRoomCreationResult>
   */
  async createProjectRoom(gitUrl: string, creatorUserId: string): Promise<ProjectRoomCreationResult> {
    try {
      // Parse the Git URL
      let gitInfo: GitUrlInfo;
      try {
        gitInfo = parseGitUrl(gitUrl);
      } catch (error) {
        if (error instanceof GitUrlParseError) {
          return {
            success: false,
            error: `Invalid Git URL format. ${error.message}`
          };
        }
        throw error;
      }

      const { owner, repo } = gitInfo;
      const repository = `${owner}/${repo}`;
      const timestamp = Date.now();

      // Create room with project configuration
      const roomOptions = {
        name: repo,
        topic: `GitHub Project: ${repository} - Managed by Morpheum Bot`,
        visibility: 'private' as const,
        room_alias_name: `${repo}-${timestamp}`,
        initial_state: [
          {
            type: 'm.room.history_visibility',
            content: { history_visibility: 'shared' }
          },
          {
            type: 'dev.morpheum.project_config',
            state_key: '',
            content: {
              repository,
              llmProvider: 'copilot',
              created_by: creatorUserId,
              created_at: new Date().toISOString(),
              version: '1.0'
            } as ProjectRoomConfig
          }
        ]
      };

      const roomId = await this.matrixClient.createRoom(roomOptions);

      return {
        success: true,
        roomId,
        projectName: repo
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle common Matrix errors with user-friendly messages
      if (errorMessage.includes('already exists') || errorMessage.includes('alias')) {
        return {
          success: false,
          error: 'A room with this project name already exists. Please try again or choose a different project.'
        };
      }
      
      if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
        return {
          success: false,
          error: 'Insufficient permissions to create a room. Please contact your administrator.'
        };
      }

      return {
        success: false,
        error: `Failed to create project room: ${errorMessage}`
      };
    }
  }

  /**
   * Invite a user to a project room
   * 
   * @param roomId - The Matrix room ID
   * @param userId - The Matrix user ID to invite
   * @returns Promise<ProjectRoomInvitationResult>
   */
  async inviteUserToRoom(roomId: string, userId: string): Promise<ProjectRoomInvitationResult> {
    try {
      await this.matrixClient.inviteUser(userId, roomId);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle common invitation errors
      if (errorMessage.includes('already in room') || errorMessage.includes('already joined')) {
        return {
          success: false,
          error: 'User is already in the room.'
        };
      }
      
      if (errorMessage.includes('not found') || errorMessage.includes('unknown user')) {
        return {
          success: false,
          error: 'User not found. Please check the user ID.'
        };
      }

      return {
        success: false,
        error: `Failed to invite user: ${errorMessage}`
      };
    }
  }

  /**
   * Get the project configuration for a room
   * 
   * @param roomId - The Matrix room ID
   * @returns Promise<ProjectRoomConfig | null>
   */
  async getProjectConfig(roomId: string): Promise<ProjectRoomConfig | null> {
    try {
      const stateEvent = await this.matrixClient.getRoomStateEvent(roomId, 'dev.morpheum.project_config', '');
      return stateEvent as ProjectRoomConfig;
    } catch (error) {
      // Room doesn't have project configuration
      return null;
    }
  }

  /**
   * Update the project configuration for a room
   * 
   * @param roomId - The Matrix room ID
   * @param config - The updated configuration
   */
  async updateProjectConfig(roomId: string, config: Partial<ProjectRoomConfig>): Promise<void> {
    const currentConfig = await this.getProjectConfig(roomId);
    if (!currentConfig) {
      throw new Error('Room is not a project room');
    }

    const updatedConfig = { ...currentConfig, ...config };
    await this.matrixClient.sendStateEvent(roomId, 'dev.morpheum.project_config', '', updatedConfig);
  }

  /**
   * Send a welcome message to a newly created project room
   * 
   * @param roomId - The Matrix room ID
   * @param repository - The repository name (owner/repo)
   */
  async sendWelcomeMessage(roomId: string, repository: string): Promise<void> {
    const welcomeMessage = `🚀 Welcome to the ${repository.split('/')[1]} project room!

This room is configured for:
📂 Repository: ${repository}
🤖 AI Provider: GitHub Copilot

You can now collaborate on this project with AI assistance.
Try asking: "Show me the latest issues" or "Help me implement a new feature"`;

    await this.matrixClient.sendMessage(roomId, {
      msgtype: 'm.text',
      body: welcomeMessage
    });
  }
}