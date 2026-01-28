import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as llmClientModule from './llmClient';

/**
 * Integration test for bot mention handling.
 * Tests the actual message processing logic that would be triggered in a Matrix room.
 */

import { MorpheumBot } from './bot';

// Simulate the message handler logic from index.ts
async function simulateMessageHandler(
  messageBody: string,
  botUserId: string,
  botDisplayName: string | undefined,
  sendMessage: (msg: string, html?: string) => Promise<void>
): Promise<boolean> {
  const localpart = botUserId.split(':')[0].substring(1); // from @user:server.com -> user
  const mentionNames = [botDisplayName, localpart, botUserId].filter(Boolean).map(n => n!.toLowerCase());
  const lowerBody = messageBody.toLowerCase();

  // Test for exact mentions
  for (const name of mentionNames) {
    // Check for exact name match followed by a delimiter or end of string
    if (lowerBody === name || 
        lowerBody.startsWith(name + ' ') ||
        lowerBody.startsWith(name + ':') ||
        lowerBody.startsWith(name + ',') ||
        lowerBody.startsWith(name + '\t') ||
        lowerBody.startsWith(name + '\n')) {
      let task = messageBody.substring(name.length).trim();
      if (task.startsWith(':') || task.startsWith(',')) {
        task = task.substring(1).trim();
      }
      
      if (task) {
        // Simulate processing the message
        const bot = new MorpheumBot();
        await bot.processMessage(task, 'test-sender', sendMessage, 'test-room');
        return true;
      } else if (lowerBody === name) {
        // Handle case where bot is mentioned without a task
        const bot = new MorpheumBot();
        await bot.processMessage('!help', 'test-sender', sendMessage, 'test-room');
        return true;
      }
    }
  }

  // Test for commands
  if (messageBody.startsWith("!")) {
    const bot = new MorpheumBot();
    await bot.processMessage(messageBody, 'test-sender', sendMessage, 'test-room');
    return true;
  }

  return false;
}

describe('Bot Mention Integration', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  const botUserId = '@morpheusbot:matrix.example.com';
  const botDisplayName = 'morpheus';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment for tests
    process.env.OLLAMA_API_URL = 'http://test-ollama:11434';
    process.env.OLLAMA_MODEL = 'test-model';
    
    vi.spyOn(fs.promises, 'readFile').mockResolvedValue('# Test Content');
    vi.spyOn(fs.promises, 'readdir').mockResolvedValue([]);
    vi.spyOn(llmClientModule, 'createLLMClient').mockResolvedValue({
      send: vi.fn().mockResolvedValue('response'),
      sendStreaming: vi.fn().mockResolvedValue("<next_step>Job's done!</next_step>"),
      getMetrics: vi.fn().mockReturnValue(null),
      resetMetrics: vi.fn(),
    } as any);

    mockSendMessage = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Exact Mention Response', () => {
    it('should respond to exact display name mention', async () => {
      const responded = await simulateMessageHandler(
        'morpheus help me with a task',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(true);
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should respond to exact localpart mention', async () => {
      const responded = await simulateMessageHandler(
        'morpheusbot: create a file',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(true);
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should respond to exact user ID mention', async () => {
      const responded = await simulateMessageHandler(
        '@morpheusbot:matrix.example.com show help',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(true);
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should respond to name with comma delimiter', async () => {
      const responded = await simulateMessageHandler(
        'morpheus, can you help?',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(true);
      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  describe('Partial Match Rejection', () => {
    it('should NOT respond to partial display name', async () => {
      const responded = await simulateMessageHandler(
        'morph help me',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(false);
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should NOT respond to name with suffix', async () => {
      const responded = await simulateMessageHandler(
        'morpheusbot123 help',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(false);
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should NOT respond to name in middle of word', async () => {
      const responded = await simulateMessageHandler(
        'supermorpheus help',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(false);
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should NOT respond to similar names', async () => {
      const responded = await simulateMessageHandler(
        'morpheusik help me',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(false);
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Commands Always Work', () => {
    it('should respond to help command regardless of mention', async () => {
      const responded = await simulateMessageHandler(
        '!help',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(true);
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should respond to other commands', async () => {
      const responded = await simulateMessageHandler(
        '!tasks',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      expect(responded).toBe(true);
      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  describe('Case Sensitivity', () => {
    it('should respond to different case variations', async () => {
      const responses = await Promise.all([
        simulateMessageHandler('MORPHEUS help', botUserId, botDisplayName, mockSendMessage),
        simulateMessageHandler('Morpheus help', botUserId, botDisplayName, mockSendMessage),
        simulateMessageHandler('MoRpHeUs help', botUserId, botDisplayName, mockSendMessage),
      ]);
      
      expect(responses).toEqual([true, true, true]);
    });
  });

  describe('Edge Cases', () => {
    it('should show help when bot is mentioned without a task', async () => {
      const responded = await simulateMessageHandler(
        'morpheus',
        botUserId,
        botDisplayName,
        mockSendMessage
      );
      
      // Should respond with help when mentioned without a task
      expect(responded).toBe(true);
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should handle undefined display name', async () => {
      const responded = await simulateMessageHandler(
        'morpheusbot help me',
        botUserId,
        undefined,
        mockSendMessage
      );
      
      expect(responded).toBe(true);
      expect(mockSendMessage).toHaveBeenCalled();
    });
  });
});
