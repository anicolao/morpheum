import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MorpheumBot } from './bot';

// Mock dependencies
vi.mock('./sweAgent');
vi.mock('./jailClient');
vi.mock('./project-room-manager');

// Mock MatrixClient
const mockMatrixClient = {
  createRoom: vi.fn(),
  inviteUser: vi.fn(),
  getRoomStateEvent: vi.fn(),
  sendStateEvent: vi.fn(),
  sendMessage: vi.fn(),
};

describe('MorpheumBot Project Commands', () => {
  let bot: MorpheumBot;
  let mockSendMessage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    bot = new MorpheumBot();
    bot.setMatrixClient(mockMatrixClient as any);
    
    mockSendMessage = vi.fn();
  });

  describe('!project help command', () => {
    it('should show project help information', async () => {
      await bot.processMessage('!project help', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Project Room Management'),
        expect.stringContaining('Project Room Management')
      );
    });
  });

  describe('!project create command', () => {
    it('should handle missing git URL', async () => {
      await bot.processMessage('!project create', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Repository name or Git URL is required')
      );
    });

    it('should handle --new flag with repository name', async () => {
      await bot.processMessage('!project create --new my-repo', '@user:example.com', mockSendMessage, '!room:example.com');

      // Should attempt to create with --new flag
      // We can't test the full flow without mocking the GitHub client
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Creating new GitHub repository')
      );
    });

    it('should handle invalid repository name with --new flag', async () => {
      await bot.processMessage('!project create --new invalid@repo!', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Invalid repository name')
      );
    });

    // NEW TESTS FOR ISSUE #154
    it('should provide helpful message when Git URL is passed to --new flag (owner/repo format)', async () => {
      await bot.processMessage('!project create --new anicolao/tabletop-image', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringMatching(/It looks like you provided a Git URL.*!project create anicolao\/tabletop-image.*!project create --new tabletop-image/s)
      );
    });

    it('should provide helpful message when Git URL is passed to --new flag (SSH format)', async () => {
      await bot.processMessage('!project create --new git@github.com:anicolao/tabletop-image', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringMatching(/It looks like you provided a Git URL.*!project create git@github\.com:anicolao\/tabletop-image.*!project create --new tabletop-image/s)
      );
    });

    it('should provide improved error message for invalid repository names', async () => {
      await bot.processMessage('!project create --new invalid@repo', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringMatching(/Invalid repository name for new repository creation.*For creating new repositories.*For existing repositories/s)
      );
    });

    it('should show help for unknown subcommands', async () => {
      await bot.processMessage('!project unknown', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Usage: !project <create|status|help>')
      );
    });
  });

  describe('!project status command', () => {
    it('should handle missing git URL', async () => {
      await bot.processMessage('!project status', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Git URL is required')
      );
    });

    it('should handle repository status request', async () => {
      await bot.processMessage('!project status facebook/react', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Fetching repository statistics')
      );
    });
  });

  describe('help command includes project commands', () => {
    it('should include project commands in general help', async () => {
      await bot.processMessage('!help', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!project create <git-url>')
      );
    });
  });
});