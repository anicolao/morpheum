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
        expect.stringContaining('Git URL is required')
      );
    });

    it('should show help for unknown subcommands', async () => {
      await bot.processMessage('!project unknown', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Usage: !project <create|help>')
      );
    });
  });

  describe('help command includes project commands', () => {
    it('should include project commands in general help', async () => {
      await bot.processMessage('!help', '@user:example.com', mockSendMessage, '!room:example.com');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!project create <git-url>'),
        expect.any(String)
      );
    });
  });
});