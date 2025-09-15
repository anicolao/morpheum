/**
 * GitHub Client - Shared utilities for GitHub API operations
 */

import { Octokit } from '@octokit/rest';
import { parseGitUrl, GitUrlInfo } from './git-url-parser';

export interface GitHubRepositoryInfo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  license: {
    name: string;
    spdx_id: string;
  } | null;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  clone_url: string;
  ssh_url: string;
}

export interface GitHubRepositoryStats {
  repository: GitHubRepositoryInfo;
  commitCount: number;
  contributors: Array<{
    login: string;
    contributions: number;
  }>;
  lastCommit: {
    sha: string;
    message: string;
    author: {
      name: string;
      date: string;
    };
  } | null;
}

export interface GitHubRepositoryCreationOptions {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
  license_template?: string;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(githubToken: string, baseUrl: string = 'https://api.github.com') {
    this.octokit = new Octokit({
      auth: githubToken,
      baseUrl: baseUrl,
    });
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    const response = await this.octokit.rest.users.getAuthenticated();
    return {
      login: response.data.login,
      id: response.data.id,
      name: response.data.name,
      email: response.data.email,
    };
  }

  /**
   * Create a new GitHub repository
   */
  async createRepository(options: GitHubRepositoryCreationOptions): Promise<GitHubRepositoryInfo> {
    const response = await this.octokit.rest.repos.createForAuthenticatedUser({
      name: options.name,
      description: options.description,
      private: options.private ?? false,
      auto_init: options.auto_init ?? true,
      license_template: options.license_template,
    });

    return {
      name: response.data.name,
      full_name: response.data.full_name,
      description: response.data.description,
      private: response.data.private,
      license: response.data.license ? {
        name: response.data.license.name,
        spdx_id: response.data.license.spdx_id,
      } : null,
      default_branch: response.data.default_branch,
      created_at: response.data.created_at,
      updated_at: response.data.updated_at,
      pushed_at: response.data.pushed_at,
      clone_url: response.data.clone_url,
      ssh_url: response.data.ssh_url,
    };
  }

  /**
   * Get repository statistics and information
   */
  async getRepositoryStats(gitUrl: string): Promise<GitHubRepositoryStats> {
    // Parse the Git URL to get owner and repo
    const gitInfo = parseGitUrl(gitUrl);
    const { owner, repo } = gitInfo;

    // Get repository information
    const repoResponse = await this.octokit.rest.repos.get({
      owner,
      repo,
    });

    const repository: GitHubRepositoryInfo = {
      name: repoResponse.data.name,
      full_name: repoResponse.data.full_name,
      description: repoResponse.data.description,
      private: repoResponse.data.private,
      license: repoResponse.data.license ? {
        name: repoResponse.data.license.name,
        spdx_id: repoResponse.data.license.spdx_id,
      } : null,
      default_branch: repoResponse.data.default_branch,
      created_at: repoResponse.data.created_at,
      updated_at: repoResponse.data.updated_at,
      pushed_at: repoResponse.data.pushed_at,
      clone_url: repoResponse.data.clone_url,
      ssh_url: repoResponse.data.ssh_url,
    };

    // Get commit count and last commit from default branch
    let commitCount = 0;
    let lastCommit = null;

    try {
      const commitsResponse = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: repository.default_branch,
        per_page: 1,
      });

      if (commitsResponse.data.length > 0) {
        const commit = commitsResponse.data[0];
        lastCommit = {
          sha: commit.sha,
          message: commit.commit.message,
          author: {
            name: commit.commit.author?.name || 'Unknown',
            date: commit.commit.author?.date || new Date().toISOString(),
          },
        };

        // Get total commit count using GraphQL API for better performance
        try {
          const graphqlResponse = await this.octokit.graphql(`
            query GetCommitCount($owner: String!, $repo: String!) {
              repository(owner: $owner, name: $repo) {
                defaultBranchRef {
                  target {
                    ... on Commit {
                      history {
                        totalCount
                      }
                    }
                  }
                }
              }
            }
          `, { owner, repo });

          // Type assertion for the GraphQL response
          const typedResponse = graphqlResponse as {
            repository: {
              defaultBranchRef: {
                target: {
                  history: {
                    totalCount: number;
                  };
                };
              };
            };
          };

          commitCount = typedResponse.repository.defaultBranchRef.target.history.totalCount;
        } catch (error) {
          // Fallback: estimate based on pagination
          console.warn('Could not get exact commit count, using estimation');
          const sampleResponse = await this.octokit.rest.repos.listCommits({
            owner,
            repo,
            per_page: 100,
          });
          commitCount = sampleResponse.data.length >= 100 ? 100 : sampleResponse.data.length;
        }
      }
    } catch (error) {
      console.warn('Could not fetch commit information:', error);
    }

    // Get contributors
    let contributors: Array<{ login: string; contributions: number }> = [];

    try {
      const contributorsResponse = await this.octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: 10, // Limit to top 10 contributors
      });

      contributors = contributorsResponse.data.map(contributor => ({
        login: contributor.login || 'unknown',
        contributions: contributor.contributions,
      }));
    } catch (error) {
      console.warn('Could not fetch contributors:', error);
    }

    return {
      repository,
      commitCount,
      contributors,
      lastCommit,
    };
  }

  /**
   * Check if a repository exists
   */
  async repositoryExists(gitUrl: string): Promise<boolean> {
    try {
      const gitInfo = parseGitUrl(gitUrl);
      const { owner, repo } = gitInfo;

      await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}