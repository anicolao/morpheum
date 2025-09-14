import { describe, it, expect } from 'vitest';
import { normalizeDashes } from './dash-normalizer';

// Test the help flag functionality
describe('Help Flag Parsing', () => {
  
  // Helper function to simulate the argument parsing logic from index.ts
  function parseArgsForTesting(args: string[]): { register?: string; help?: boolean } {
    const normalizedArgs = args.map(normalizeDashes);
    const result: { register?: string; help?: boolean } = {};

    for (let i = 0; i < normalizedArgs.length; i++) {
      if (normalizedArgs[i] === '--help' || normalizedArgs[i] === '-h') {
        result.help = true;
      } else if (normalizedArgs[i] === '--register' && i + 1 < normalizedArgs.length) {
        result.register = normalizedArgs[i + 1];
        i++; // Skip next argument
      }
    }

    return result;
  }

  describe('Help Flag Recognition', () => {
    it('should recognize --help flag', () => {
      const args = ['--help'];
      const result = parseArgsForTesting(args);
      expect(result.help).toBe(true);
    });

    it('should recognize -h short flag', () => {
      const args = ['-h'];
      const result = parseArgsForTesting(args);
      expect(result.help).toBe(true);
    });

    it('should handle help flag with other arguments', () => {
      const args = ['--register', 'matrix.morpheum.dev', '--help'];
      const result = parseArgsForTesting(args);
      expect(result.help).toBe(true);
      expect(result.register).toBe('matrix.morpheum.dev');
    });

    it('should not set help when not present', () => {
      const args = ['--register', 'matrix.morpheum.dev'];
      const result = parseArgsForTesting(args);
      expect(result.help).toBeUndefined();
      expect(result.register).toBe('matrix.morpheum.dev');
    });
  });

  describe('Unicode Dash Support for Help Flag', () => {
    it('should recognize help with em dash (—help)', () => {
      const args = ['—help'];
      const result = parseArgsForTesting(args);
      expect(result.help).toBe(true);
    });

    it('should recognize help with en dash (–help)', () => {
      const args = ['–help'];
      const result = parseArgsForTesting(args);
      expect(result.help).toBe(true);
    });

    it('should handle mixed Unicode dashes', () => {
      const args = ['—register', 'matrix.morpheum.dev', '–help'];
      const result = parseArgsForTesting(args);
      expect(result.help).toBe(true);
      expect(result.register).toBe('matrix.morpheum.dev');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arguments', () => {
      const args: string[] = [];
      const result = parseArgsForTesting(args);
      expect(result.help).toBeUndefined();
      expect(result.register).toBeUndefined();
    });

    it('should handle help flag multiple times', () => {
      const args = ['--help', '-h', '--help'];
      const result = parseArgsForTesting(args);
      expect(result.help).toBe(true);
    });

    it('should prioritize help over other flags', () => {
      const args = ['-h', '--register', 'matrix.morpheum.dev'];
      const result = parseArgsForTesting(args);
      expect(result.help).toBe(true);
      expect(result.register).toBe('matrix.morpheum.dev');
    });
  });
});