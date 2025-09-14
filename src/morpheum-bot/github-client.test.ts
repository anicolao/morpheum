import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubClient } from './github-client';

// Mock Octokit
const mockOctokit = {
  rest: {
    users: {
      getAuthenticated: vi.fn(),
    },
    repos: {
      get: vi.fn(),
      createForAuthenticatedUser: vi.fn(),
      listCommits: vi.fn(),
      listContributors: vi.fn(),
    },
  },
  graphql: vi.fn(),
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

describe('GitHubClient', () => {
  let githubClient: GitHubClient;

  beforeEach(() => {
    vi.clearAllMocks();
    githubClient = new GitHubClient('fake-token');
  });

  describe('getCurrentUser', () => {
    it('should return current user info', async () => {
      const mockUserData = {
        login: 'testuser',
        id: 12345,
        name: 'Test User',
        email: 'test@example.com',
      };

      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: mockUserData
      });

      const result = await githubClient.getCurrentUser();

      expect(result).toEqual(mockUserData);
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalledOnce();
    });
  });

  describe('createRepository', () => {
    it('should create a repository with correct options', async () => {
      const mockRepoData = {
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        description: 'Test repository',
        private: false,
        license: { name: 'MIT License', spdx_id: 'MIT' },
        default_branch: 'main',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
        clone_url: 'https://github.com/testuser/test-repo.git',
        ssh_url: 'git@github.com:testuser/test-repo.git',
      };

      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
        data: mockRepoData
      });

      const options = {
        name: 'test-repo',
        description: 'Test repository',
        private: false,
        auto_init: true,
      };

      const result = await githubClient.createRepository(options);

      expect(result).toEqual({
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        description: 'Test repository',
        private: false,
        license: { name: 'MIT License', spdx_id: 'MIT' },
        default_branch: 'main',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
        clone_url: 'https://github.com/testuser/test-repo.git',
        ssh_url: 'git@github.com:testuser/test-repo.git',
      });

      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'test-repo',
        description: 'Test repository',
        private: false,
        auto_init: true,
        license_template: undefined,
      });
    });
  });

  describe('getRepositoryStats', () => {
    it('should fetch repository statistics', async () => {
      const mockRepoData = {
        name: 'test-repo',
        full_name: 'facebook/react',
        description: 'A declarative, efficient library',
        private: false,
        license: { name: 'MIT License', spdx_id: 'MIT' },
        default_branch: 'main',
        created_at: '2013-05-24T16:15:54Z',
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
        clone_url: 'https://github.com/facebook/react.git',
        ssh_url: 'git@github.com:facebook/react.git',
      };

      const mockCommitData = [
        {
          sha: 'abc123',
          commit: {
            message: 'Fix something',
            author: {
              name: 'Test Author',
              date: '2024-01-01T00:00:00Z',
            },
          },
        },
      ];

      const mockContributorData = [
        { login: 'gaearon', contributions: 1500 },
        { login: 'sebmarkbage', contributions: 1000 },
      ];

      const mockGraphQLResponse = {
        repository: {
          defaultBranchRef: {
            target: {
              history: {
                totalCount: 15000,
              },
            },
          },
        },
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepoData });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: mockCommitData });
      mockOctokit.rest.repos.listContributors.mockResolvedValue({ data: mockContributorData });
      mockOctokit.graphql.mockResolvedValue(mockGraphQLResponse);

      const result = await githubClient.getRepositoryStats('facebook/react');

      expect(result.repository.full_name).toBe('facebook/react');
      expect(result.commitCount).toBe(15000);
      expect(result.contributors).toHaveLength(2);
      expect(result.lastCommit?.sha).toBe('abc123');
    });
  });

  describe('repositoryExists', () => {
    it('should return true if repository exists', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ data: {} });

      const result = await githubClient.repositoryExists('facebook/react');

      expect(result).toBe(true);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'facebook',
        repo: 'react',
      });
    });

    it('should return false if repository does not exist', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue(new Error('Not Found'));

      const result = await githubClient.repositoryExists('nonexistent/repo');

      expect(result).toBe(false);
    });
  });
});