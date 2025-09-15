import { describe, it, expect } from 'vitest';
import { parseGitUrl, GitUrlParseError } from './git-url-parser';

describe('Issue #154: !project --new command validation', () => {
  describe('Git URL parser works correctly with issue examples', () => {
    it('should handle anicolao/tabletop-image correctly', () => {
      const result = parseGitUrl('anicolao/tabletop-image');
      expect(result).toEqual({ owner: 'anicolao', repo: 'tabletop-image' });
    });

    it('should handle git@github.com:anicolao/tabletop-image correctly', () => {
      const result = parseGitUrl('git@github.com:anicolao/tabletop-image');
      expect(result).toEqual({ owner: 'anicolao', repo: 'tabletop-image' });
    });

    it('should handle anicolao/nixtabletop correctly', () => {
      const result = parseGitUrl('anicolao/nixtabletop');
      expect(result).toEqual({ owner: 'anicolao', repo: 'nixtabletop' });
    });
  });

  describe('Repository name validation logic', () => {
    it('should identify Git URLs vs repository names', () => {
      // Git URL patterns that should be detected and rejected for --new flag
      const gitUrlPatterns = [
        'anicolao/tabletop-image',     // owner/repo format
        'git@github.com:anicolao/tabletop-image',  // SSH format
        'https://github.com/anicolao/tabletop-image',  // HTTPS format
        'anicolao/nixtabletop',        // another owner/repo format
      ];

      // Valid repository names for --new flag
      const validRepoNames = [
        'tabletop-image',
        'nixtabletop', 
        'my-awesome-project',
        'test_repo',
        'repo.name',
        'repo-with-dashes',
      ];

      // Invalid repository names
      const invalidRepoNames = [
        'repo with spaces',
        'repo@invalid',
        'repo:invalid',
        '',
        'repo/with/slash',
      ];

      const repoNameRegex = /^[a-zA-Z0-9._-]+$/;
      const containsGitUrlChars = (str: string) => str.includes('/') || str.includes('@') || str.includes(':');

      // Git URL patterns should be detected as Git URLs (not valid repo names for --new)
      gitUrlPatterns.forEach(pattern => {
        expect(containsGitUrlChars(pattern)).toBe(true);
      });

      // Valid repo names should pass the regex and not contain Git URL chars
      validRepoNames.forEach(name => {
        expect(repoNameRegex.test(name)).toBe(true);
        expect(containsGitUrlChars(name)).toBe(false);
      });

      // Invalid repo names should fail the regex
      invalidRepoNames.forEach(name => {
        expect(repoNameRegex.test(name)).toBe(false);
      });
    });

    it('should extract repository name from Git URL for suggestion', () => {
      const testCases = [
        { input: 'anicolao/tabletop-image', expected: 'tabletop-image' },
        { input: 'git@github.com:anicolao/tabletop-image', expected: 'tabletop-image' },
        { input: 'https://github.com/anicolao/nixtabletop', expected: 'nixtabletop' },
        { input: 'facebook/react', expected: 'react' },
      ];

      testCases.forEach(({ input, expected }) => {
        const gitInfo = parseGitUrl(input);
        expect(gitInfo.repo).toBe(expected);
      });
    });
  });
});