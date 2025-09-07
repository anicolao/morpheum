import { describe, it, expect } from 'vitest';
import { normalizeDashes } from './dash-normalizer';

// Test the registration argument parsing functionality
describe('Registration Argument Parsing', () => {
  
  // Helper function to simulate the argument parsing logic from index.ts
  function parseArgsForTesting(args: string[]): { register?: string } {
    const normalizedArgs = args.map(normalizeDashes);
    const result: { register?: string } = {};

    for (let i = 0; i < normalizedArgs.length; i++) {
      if (normalizedArgs[i] === '--register' && i + 1 < normalizedArgs.length) {
        result.register = normalizedArgs[i + 1];
        i++; // Skip next argument
      }
    }

    return result;
  }

  // Helper function to generate registration token environment variable name
  function generateRegistrationTokenEnvVar(serverUrl: string): string {
    const cleanServerName = serverUrl
      .replace(/[^a-zA-Z0-9]/g, '_')  // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')           // Replace multiple underscores with single
      .replace(/^_|_$/g, '')         // Remove leading/trailing underscores
      .toUpperCase();
    
    return `REGISTRATION_TOKEN_${cleanServerName}`;
  }

  describe('Argument Parsing', () => {
    it('should parse --register with server URL', () => {
      const args = ['--register', 'matrix.morpheum.dev'];
      const result = parseArgsForTesting(args);
      expect(result.register).toBe('matrix.morpheum.dev');
    });

    it('should handle Unicode em dash in --register', () => {
      const args = ['—register', 'matrix.morpheum.dev']; // em dash
      const result = parseArgsForTesting(args);
      expect(result.register).toBe('matrix.morpheum.dev');
    });

    it('should handle Unicode en dash in --register', () => {
      const args = ['–register', 'matrix.morpheum.dev']; // en dash
      const result = parseArgsForTesting(args);
      expect(result.register).toBe('matrix.morpheum.dev');
    });

    it('should return empty result when no --register flag', () => {
      const args = ['--other-flag', 'value'];
      const result = parseArgsForTesting(args);
      expect(result.register).toBeUndefined();
    });

    it('should handle multiple arguments with --register', () => {
      const args = ['--other-flag', 'value', '--register', 'test.matrix.org'];
      const result = parseArgsForTesting(args);
      expect(result.register).toBe('test.matrix.org');
    });
  });

  describe('Environment Variable Generation', () => {
    it('should generate correct env var name for matrix.morpheum.dev', () => {
      const result = generateRegistrationTokenEnvVar('matrix.morpheum.dev');
      expect(result).toBe('REGISTRATION_TOKEN_MATRIX_MORPHEUM_DEV');
    });

    it('should generate correct env var name for test.matrix.org', () => {
      const result = generateRegistrationTokenEnvVar('test.matrix.org');
      expect(result).toBe('REGISTRATION_TOKEN_TEST_MATRIX_ORG');
    });

    it('should handle complex domain names', () => {
      const result = generateRegistrationTokenEnvVar('my-server.example.com');
      expect(result).toBe('REGISTRATION_TOKEN_MY_SERVER_EXAMPLE_COM');
    });

    it('should handle domains with ports', () => {
      const result = generateRegistrationTokenEnvVar('localhost:8008');
      expect(result).toBe('REGISTRATION_TOKEN_LOCALHOST_8008');
    });

    it('should handle special characters', () => {
      const result = generateRegistrationTokenEnvVar('matrix.example-test.org');
      expect(result).toBe('REGISTRATION_TOKEN_MATRIX_EXAMPLE_TEST_ORG');
    });

    it('should remove leading/trailing underscores', () => {
      const result = generateRegistrationTokenEnvVar('_matrix.org_');
      expect(result).toBe('REGISTRATION_TOKEN_MATRIX_ORG');
    });

    it('should collapse multiple underscores', () => {
      const result = generateRegistrationTokenEnvVar('matrix...example...org');
      expect(result).toBe('REGISTRATION_TOKEN_MATRIX_EXAMPLE_ORG');
    });
  });
});