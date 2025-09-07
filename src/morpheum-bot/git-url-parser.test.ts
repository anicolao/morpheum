import { describe, it, expect } from 'vitest';
import { parseGitUrl, GitUrlParseError, isValidGitInfo } from './git-url-parser';

describe('parseGitUrl', () => {
  describe('SSH format', () => {
    it('should parse SSH URL without .git suffix', () => {
      const result = parseGitUrl('git@github.com:facebook/react');
      expect(result).toEqual({ owner: 'facebook', repo: 'react' });
    });

    it('should parse SSH URL with .git suffix', () => {
      const result = parseGitUrl('git@github.com:vercel/next.js.git');
      expect(result).toEqual({ owner: 'vercel', repo: 'next.js' });
    });
  });

  describe('HTTPS format', () => {
    it('should parse HTTPS URL without .git suffix', () => {
      const result = parseGitUrl('https://github.com/microsoft/vscode');
      expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
    });

    it('should parse HTTPS URL with .git suffix', () => {
      const result = parseGitUrl('https://github.com/microsoft/vscode.git');
      expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
    });

    it('should parse HTTPS URL with trailing slash', () => {
      const result = parseGitUrl('https://github.com/microsoft/vscode/');
      expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
    });
  });

  describe('Short format', () => {
    it('should parse short format', () => {
      const result = parseGitUrl('facebook/react');
      expect(result).toEqual({ owner: 'facebook', repo: 'react' });
    });

    it('should parse short format with dots and hyphens', () => {
      const result = parseGitUrl('ant-design/ant-design');
      expect(result).toEqual({ owner: 'ant-design', repo: 'ant-design' });
    });
  });

  describe('Error cases', () => {
    it('should throw error for empty string', () => {
      expect(() => parseGitUrl('')).toThrow(GitUrlParseError);
    });

    it('should throw error for non-string input', () => {
      expect(() => parseGitUrl(null as any)).toThrow(GitUrlParseError);
    });

    it('should throw error for invalid URL format', () => {
      expect(() => parseGitUrl('invalid-url')).toThrow(GitUrlParseError);
    });

    it('should throw error for non-GitHub URLs', () => {
      expect(() => parseGitUrl('git@gitlab.com:user/repo')).toThrow(GitUrlParseError);
    });

    it('should throw error for short format with spaces', () => {
      expect(() => parseGitUrl('user name/repo')).toThrow(GitUrlParseError);
    });

    it('should provide helpful error message', () => {
      expect(() => parseGitUrl('invalid')).toThrow(/Supported formats/);
    });
  });
});

describe('isValidGitInfo', () => {
  it('should validate correct git info', () => {
    expect(isValidGitInfo({ owner: 'facebook', repo: 'react' })).toBe(true);
  });

  it('should reject empty owner', () => {
    expect(isValidGitInfo({ owner: '', repo: 'react' })).toBe(false);
  });

  it('should reject empty repo', () => {
    expect(isValidGitInfo({ owner: 'facebook', repo: '' })).toBe(false);
  });

  it('should reject very long names', () => {
    const longName = 'a'.repeat(150);
    expect(isValidGitInfo({ owner: longName, repo: 'react' })).toBe(false);
    expect(isValidGitInfo({ owner: 'facebook', repo: longName })).toBe(false);
  });

  it('should reject invalid characters', () => {
    expect(isValidGitInfo({ owner: 'face@book', repo: 'react' })).toBe(false);
    expect(isValidGitInfo({ owner: 'facebook', repo: 're act' })).toBe(false);
  });

  it('should reject names starting with special characters', () => {
    expect(isValidGitInfo({ owner: '-facebook', repo: 'react' })).toBe(false);
    expect(isValidGitInfo({ owner: 'facebook', repo: '.react' })).toBe(false);
  });

  it('should reject names ending with special characters', () => {
    expect(isValidGitInfo({ owner: 'facebook-', repo: 'react' })).toBe(false);
    expect(isValidGitInfo({ owner: 'facebook', repo: 'react_' })).toBe(false);
  });
});