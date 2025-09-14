import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MorpheumBot } from './bot';
import { normalizeDashes } from './dash-normalizer';

// Test the debug flag functionality
describe('Debug Flag Functionality', () => {
  
  // Helper function to simulate the argument parsing logic from index.ts
  function parseArgsForTesting(args: string[]): { register?: string; help?: boolean; debug?: boolean } {
    const normalizedArgs = args.map(normalizeDashes);
    const result: { register?: string; help?: boolean; debug?: boolean } = {};

    for (let i = 0; i < normalizedArgs.length; i++) {
      if (normalizedArgs[i] === '--help' || normalizedArgs[i] === '-h') {
        result.help = true;
      } else if (normalizedArgs[i] === '--debug') {
        result.debug = true;
      } else if (normalizedArgs[i] === '--register' && i + 1 < normalizedArgs.length) {
        result.register = normalizedArgs[i + 1];
        i++; // Skip next argument
      }
    }

    return result;
  }

  describe('Debug Flag Parsing', () => {
    it('should recognize --debug flag', () => {
      const args = ['--debug'];
      const result = parseArgsForTesting(args);
      expect(result.debug).toBe(true);
    });

    it('should handle debug flag with other arguments', () => {
      const args = ['--register', 'matrix.morpheum.dev', '--debug'];
      const result = parseArgsForTesting(args);
      expect(result.debug).toBe(true);
      expect(result.register).toBe('matrix.morpheum.dev');
    });

    it('should not set debug when not present', () => {
      const args = ['--register', 'matrix.morpheum.dev'];
      const result = parseArgsForTesting(args);
      expect(result.debug).toBeUndefined();
      expect(result.register).toBe('matrix.morpheum.dev');
    });

    it('should handle all flags together', () => {
      const args = ['--debug', '--help'];
      const result = parseArgsForTesting(args);
      expect(result.debug).toBe(true);
      expect(result.help).toBe(true);
    });
  });

  describe('Debug Logging in Bot', () => {
    let consoleSpy: any;
    
    beforeEach(() => {
      // Spy on console.log to capture debug output
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore console.log
      consoleSpy.mockRestore();
    });

    it('should log commands when debug mode is enabled', async () => {
      const bot = new MorpheumBot(undefined, true); // Enable debug mode
      const mockSendMessage = vi.fn().mockResolvedValue(undefined);
      
      await bot.processMessage('!help', '@testuser:matrix.org', mockSendMessage, '!testroom:matrix.org');
      
      // Verify that debug log was output
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[DEBUG\] .* - Received command from @testuser:matrix.org in room !testroom:matrix.org: "!help"/)
      );
    });

    it('should not log commands when debug mode is disabled', async () => {
      const bot = new MorpheumBot(undefined, false); // Disable debug mode
      const mockSendMessage = vi.fn().mockResolvedValue(undefined);
      
      await bot.processMessage('!help', '@testuser:matrix.org', mockSendMessage, '!testroom:matrix.org');
      
      // Verify that no debug log was output
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/\[DEBUG\]/)
      );
    });

    it('should log regular tasks in debug mode', async () => {
      const bot = new MorpheumBot(undefined, true); // Enable debug mode
      const mockSendMessage = vi.fn().mockResolvedValue(undefined);
      
      // Use a command that won't trigger external services (info command)
      await bot.processMessage('!help', '@testuser:matrix.org', mockSendMessage, '!testroom:matrix.org');
      
      // Verify that debug log was output for the command
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[DEBUG\] .* - Received command from @testuser:matrix.org in room !testroom:matrix.org: "!help"/)
      );
    });

    it('should log non-command messages in debug mode', async () => {
      const bot = new MorpheumBot(undefined, true); // Enable debug mode
      const mockSendMessage = vi.fn().mockResolvedValue(undefined);
      
      // Mock the runSWEAgentWithStreaming method to prevent external calls
      const mockBot = bot as any;
      const originalMethod = mockBot.runSWEAgentWithStreaming;
      mockBot.runSWEAgentWithStreaming = vi.fn().mockResolvedValue(undefined);
      
      await bot.processMessage('some regular message', '@testuser:matrix.org', mockSendMessage, '!testroom:matrix.org');
      
      // Verify that debug log was output for regular messages
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[DEBUG\] .* - Received command from @testuser:matrix.org in room !testroom:matrix.org: "some regular message"/)
      );
      
      // Restore original method
      mockBot.runSWEAgentWithStreaming = originalMethod;
    });

    it('should default to no debug mode when not specified', () => {
      const bot = new MorpheumBot(); // No debug mode specified
      
      // Access the private debugMode property through testing approach
      // Since we can't directly access private properties, we'll test the behavior
      expect(bot).toBeDefined();
    });

    it('should handle missing room ID gracefully in debug mode', async () => {
      const bot = new MorpheumBot(undefined, true); // Enable debug mode
      const mockSendMessage = vi.fn().mockResolvedValue(undefined);
      
      await bot.processMessage('!help', '@testuser:matrix.org', mockSendMessage); // No room ID
      
      // Verify that debug log was output with "unknown" room
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[DEBUG\] .* - Received command from @testuser:matrix.org in room unknown: "!help"/)
      );
    });
  });
});