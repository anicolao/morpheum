import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectRoomManager } from './project-room-manager';

// Mock MatrixClient
const mockMatrixClient = {
  createRoom: vi.fn(),
  inviteUser: vi.fn(),
  getRoomStateEvent: vi.fn(),
  sendStateEvent: vi.fn(),
  sendMessage: vi.fn(),
};

describe('ProjectRoomManager', () => {
  let roomManager: ProjectRoomManager;

  beforeEach(() => {
    vi.clearAllMocks();
    roomManager = new ProjectRoomManager(mockMatrixClient as any);
  });

  describe('createProjectRoom', () => {
    it('should create a room for valid GitHub URL', async () => {
      const mockRoomId = '!test:example.com';
      mockMatrixClient.createRoom.mockResolvedValue(mockRoomId);

      const result = await roomManager.createProjectRoom('facebook/react', '@user:example.com');

      expect(result.success).toBe(true);
      expect(result.roomId).toBe(mockRoomId);
      expect(result.projectName).toBe('react');
      
      expect(mockMatrixClient.createRoom).toHaveBeenCalledWith({
        name: 'react',
        topic: 'GitHub Project: facebook/react - Managed by Morpheum Bot',
        visibility: 'private',
        room_alias_name: expect.stringMatching(/^react-\d+$/),
        initial_state: [
          {
            type: 'm.room.history_visibility',
            content: { history_visibility: 'shared' }
          },
          {
            type: 'dev.morpheum.project_config',
            state_key: '',
            content: {
              repository: 'facebook/react',
              llmProvider: 'copilot',
              created_by: '@user:example.com',
              created_at: expect.any(String),
              version: '1.0'
            }
          }
        ]
      });
    });

    it('should handle invalid Git URL', async () => {
      const result = await roomManager.createProjectRoom('invalid-url', '@user:example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Git URL format');
      expect(mockMatrixClient.createRoom).not.toHaveBeenCalled();
    });

    it('should handle room creation errors', async () => {
      mockMatrixClient.createRoom.mockRejectedValue(new Error('Room already exists'));

      const result = await roomManager.createProjectRoom('facebook/react', '@user:example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should handle permission errors', async () => {
      mockMatrixClient.createRoom.mockRejectedValue(new Error('Forbidden: insufficient permissions'));

      const result = await roomManager.createProjectRoom('facebook/react', '@user:example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });
  });

  describe('inviteUserToRoom', () => {
    it('should successfully invite user', async () => {
      mockMatrixClient.inviteUser.mockResolvedValue(undefined);

      const result = await roomManager.inviteUserToRoom('!room:example.com', '@user:example.com');

      expect(result.success).toBe(true);
      expect(mockMatrixClient.inviteUser).toHaveBeenCalledWith('@user:example.com', '!room:example.com');
    });

    it('should handle user already in room', async () => {
      mockMatrixClient.inviteUser.mockRejectedValue(new Error('User already in room'));

      const result = await roomManager.inviteUserToRoom('!room:example.com', '@user:example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already in the room');
    });

    it('should handle user not found', async () => {
      mockMatrixClient.inviteUser.mockRejectedValue(new Error('User not found'));

      const result = await roomManager.inviteUserToRoom('!room:example.com', '@invalid:example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('getProjectConfig', () => {
    it('should return project config when available', async () => {
      const mockConfig = {
        repository: 'facebook/react',
        llmProvider: 'copilot' as const,
        created_by: '@user:example.com',
        created_at: '2024-01-01T00:00:00Z',
        version: '1.0'
      };
      mockMatrixClient.getRoomStateEvent.mockResolvedValue(mockConfig);

      const result = await roomManager.getProjectConfig('!room:example.com');

      expect(result).toEqual(mockConfig);
      expect(mockMatrixClient.getRoomStateEvent).toHaveBeenCalledWith(
        '!room:example.com',
        'dev.morpheum.project_config',
        ''
      );
    });

    it('should return null when config not available', async () => {
      mockMatrixClient.getRoomStateEvent.mockRejectedValue(new Error('State event not found'));

      const result = await roomManager.getProjectConfig('!room:example.com');

      expect(result).toBeNull();
    });
  });

  describe('sendWelcomeMessage', () => {
    it('should send welcome message to room', async () => {
      mockMatrixClient.sendMessage.mockResolvedValue(undefined);

      await roomManager.sendWelcomeMessage('!room:example.com', 'facebook/react');

      expect(mockMatrixClient.sendMessage).toHaveBeenCalledWith('!room:example.com', {
        msgtype: 'm.text',
        body: expect.stringContaining('Welcome to the react project room!')
      });
    });
  });
});