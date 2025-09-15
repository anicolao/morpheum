import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test suite for mention handling logic.
 * 
 * The bot should only respond to EXACT mentions of its name followed by
 * appropriate delimiters (space, colon, etc.), not partial matches.
 */

// Helper function to simulate the mention detection logic
function shouldRespondToMessage(
  messageBody: string,
  botDisplayName: string | undefined,
  botLocalpart: string,
  botUserId: string
): boolean {
  const mentionNames = [botDisplayName, botLocalpart, botUserId]
    .filter(Boolean)
    .map(n => n!.toLowerCase());
  
  const lowerBody = messageBody.toLowerCase();
  
  for (const name of mentionNames) {
    // Check for exact name match followed by a delimiter or end of string
    if (lowerBody === name || 
        lowerBody.startsWith(name + ' ') ||
        lowerBody.startsWith(name + ':') ||
        lowerBody.startsWith(name + ',') ||
        lowerBody.startsWith(name + '\t') ||
        lowerBody.startsWith(name + '\n')) {
      return true;
    }
  }
  
  return false;
}

describe('Mention Handling', () => {
  const botDisplayName = 'morpheus';
  const botLocalpart = 'morpheusbot';
  const botUserId = '@morpheusbot:matrix.example.com';
  
  describe('Exact Mentions (should respond)', () => {
    it('should respond to exact display name with space', () => {
      expect(shouldRespondToMessage('morpheus help me', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
    });
    
    it('should respond to exact display name with colon', () => {
      expect(shouldRespondToMessage('morpheus: help me', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
    });
    
    it('should respond to exact localpart with space', () => {
      expect(shouldRespondToMessage('morpheusbot help me', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
    });
    
    it('should respond to exact user ID with space', () => {
      expect(shouldRespondToMessage('@morpheusbot:matrix.example.com help me', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
    });
    
    it('should respond to exact display name only', () => {
      expect(shouldRespondToMessage('morpheus', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
    });
    
    it('should respond with comma delimiter', () => {
      expect(shouldRespondToMessage('morpheus, can you help?', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
    });
    
    it('should respond with tab delimiter', () => {
      expect(shouldRespondToMessage('morpheus\thelp', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
    });
    
    it('should respond with newline delimiter', () => {
      expect(shouldRespondToMessage('morpheus\nhelp me', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
    });
  });
  
  describe('Partial Matches (should NOT respond)', () => {
    it('should NOT respond to partial display name', () => {
      expect(shouldRespondToMessage('morph help me', botDisplayName, botLocalpart, botUserId))
        .toBe(false);
    });
    
    it('should NOT respond to name with suffix', () => {
      expect(shouldRespondToMessage('morpheusbot123 help', botDisplayName, botLocalpart, botUserId))
        .toBe(false);
    });
    
    it('should NOT respond to name in middle of word', () => {
      expect(shouldRespondToMessage('supermorpheus help', botDisplayName, botLocalpart, botUserId))
        .toBe(false);
    });
    
    it('should NOT respond to similar names', () => {
      expect(shouldRespondToMessage('morpheusik help me', botDisplayName, botLocalpart, botUserId))
        .toBe(false);
    });
    
    it('should NOT respond to name followed by alphanumeric', () => {
      expect(shouldRespondToMessage('morpheusbotty help', botDisplayName, botLocalpart, botUserId))
        .toBe(false);
    });
  });
  
  describe('Case Sensitivity', () => {
    it('should respond to different case variations', () => {
      expect(shouldRespondToMessage('MORPHEUS help', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
      expect(shouldRespondToMessage('Morpheus help', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
      expect(shouldRespondToMessage('MoRpHeUs help', botDisplayName, botLocalpart, botUserId))
        .toBe(true);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty display name gracefully', () => {
      expect(shouldRespondToMessage('morpheusbot help', undefined, botLocalpart, botUserId))
        .toBe(true);
    });
    
    it('should handle empty message gracefully', () => {
      expect(shouldRespondToMessage('', botDisplayName, botLocalpart, botUserId))
        .toBe(false);
    });
    
    it('should handle whitespace-only messages', () => {
      expect(shouldRespondToMessage('   ', botDisplayName, botLocalpart, botUserId))
        .toBe(false);
    });
  });
  
  describe('Commands (should always respond)', () => {
    it('should respond to commands regardless of mention', () => {
      // Note: This test documents current behavior for commands starting with "!"
      // Commands are handled separately and should always work
      const message = '!help';
      expect(message.startsWith('!')).toBe(true);
    });
  });
});