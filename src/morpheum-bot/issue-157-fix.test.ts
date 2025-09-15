import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MorpheumBot } from './bot';

// Mock dependencies
vi.mock('./sweAgent');
vi.mock('./jailClient');

// Mock ProjectRoomManager to capture what arguments are passed
const mockCreateProjectRoom = vi.fn();
vi.mock('./project-room-manager', () => {
  return {
    ProjectRoomManager: vi.fn().mockImplementation(() => ({
      createProjectRoom: mockCreateProjectRoom,
      inviteUserToRoom: vi.fn().mockResolvedValue({ success: true }),
      getProjectConfig: vi.fn().mockResolvedValue({ repository: 'test/repo' }),
      sendWelcomeMessage: vi.fn().mockResolvedValue(undefined),
    }))
  };
});

// Mock MatrixClient  
const mockMatrixClient = {
  createRoom: vi.fn(),
  inviteUser: vi.fn(),
  getRoomStateEvent: vi.fn(),
  sendStateEvent: vi.fn(),
  sendMessage: vi.fn(),
};

describe('Issue #157 Fix: Unicode dash normalization in project create', () => {
  let bot: MorpheumBot;
  let mockSendMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    bot = new MorpheumBot();
    bot.setMatrixClient(mockMatrixClient as any);
    mockSendMessage = vi.fn();
    
    // Setup the mock to return success
    mockCreateProjectRoom.mockResolvedValue({
      success: true,
      roomId: '!test:example.com',
      projectName: 'test-project'
    });
  });

  it('should handle em dash —new correctly (issue #157)', async () => {
    await bot.processMessage('!project create —new my-repo', '@user:example.com', mockSendMessage, '!room:example.com');

    // Should correctly normalize the em dash and treat as new repository
    expect(mockCreateProjectRoom).toHaveBeenCalledWith(
      '__NEW_REPO__/my-repo',
      '@user:example.com',
      expect.objectContaining({
        createRepository: true,
        repositoryOptions: expect.objectContaining({
          name: 'my-repo'
        })
      })
    );
  });

  it('should handle en dash –new correctly', async () => {
    await bot.processMessage('!project create –new my-repo', '@user:example.com', mockSendMessage, '!room:example.com');

    // Should correctly normalize the en dash and treat as new repository
    expect(mockCreateProjectRoom).toHaveBeenCalledWith(
      '__NEW_REPO__/my-repo',
      '@user:example.com',
      expect.objectContaining({
        createRepository: true,
        repositoryOptions: expect.objectContaining({
          name: 'my-repo'
        })
      })
    );
  });

  it('should still work with regular double dash --new', async () => {
    await bot.processMessage('!project create --new my-repo', '@user:example.com', mockSendMessage, '!room:example.com');

    // Should work normally
    expect(mockCreateProjectRoom).toHaveBeenCalledWith(
      '__NEW_REPO__/my-repo',
      '@user:example.com',
      expect.objectContaining({
        createRepository: true,
        repositoryOptions: expect.objectContaining({
          name: 'my-repo'
        })
      })
    );
  });

  it('should provide helpful message when Git URL is passed with Unicode dash', async () => {
    await bot.processMessage('!project create —new owner/repo', '@user:example.com', mockSendMessage, '!room:example.com');

    // Should detect the Git URL and provide helpful message
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringMatching(/It looks like you provided a Git URL.*!project create owner\/repo.*!project create --new repo/s)
    );
    
    // Should NOT call createProjectRoom
    expect(mockCreateProjectRoom).not.toHaveBeenCalled();
  });

  it('should reproduce the exact commands from issue #157', async () => {
    // Test: !project create —new tabletop-image
    vi.clearAllMocks();
    await bot.processMessage('!project create —new tabletop-image', '@user:example.com', mockSendMessage, '!room:example.com');
    
    expect(mockCreateProjectRoom).toHaveBeenCalledWith(
      '__NEW_REPO__/tabletop-image',
      '@user:example.com',
      expect.objectContaining({
        createRepository: true,
        repositoryOptions: expect.objectContaining({
          name: 'tabletop-image'
        })
      })
    );

    // Test: !project create —new anicolao/nixtabletop  
    vi.clearAllMocks();
    await bot.processMessage('!project create —new anicolao/nixtabletop', '@user:example.com', mockSendMessage, '!room:example.com');
    
    // Should provide helpful message, not call createProjectRoom
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringMatching(/It looks like you provided a Git URL.*!project create anicolao\/nixtabletop.*!project create --new nixtabletop/s)
    );
    expect(mockCreateProjectRoom).not.toHaveBeenCalled();
  });
});