/**
 * Git URL Parser - Parse various Git URL formats to extract owner and repository
 * Supports SSH, HTTPS, and short format GitHub URLs
 */

export interface GitUrlInfo {
  owner: string;
  repo: string;
}

export class GitUrlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitUrlParseError';
  }
}

/**
 * Parse various Git URL formats to extract owner and repository information
 * 
 * @param gitUrl - The Git URL to parse
 * @returns GitUrlInfo object containing owner and repo
 * @throws GitUrlParseError if the URL format is invalid
 */
export function parseGitUrl(gitUrl: string): GitUrlInfo {
  if (!gitUrl || typeof gitUrl !== 'string') {
    throw new GitUrlParseError('Git URL is required and must be a string');
  }

  const trimmedUrl = gitUrl.trim();
  
  // SSH format: git@github.com:user/repo or git@github.com:user/repo.git
  const sshMatch = trimmedUrl.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return {
      owner: sshMatch[1]!,
      repo: sshMatch[2]!
    };
  }

  // HTTPS format: https://github.com/user/repo or https://github.com/user/repo.git
  const httpsMatch = trimmedUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/)?$/);
  if (httpsMatch) {
    return {
      owner: httpsMatch[1]!,
      repo: httpsMatch[2]!
    };
  }

  // Short format: user/repo (must not contain special characters like @, :, etc.)
  const shortMatch = trimmedUrl.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/);
  if (shortMatch) {
    // Validate that it looks like a valid GitHub username/repo combination
    const owner = shortMatch[1]!;
    const repo = shortMatch[2]!;
    
    // Must not contain protocol-like characters that indicate it's actually a URL
    if (owner.includes('@') || owner.includes(':') || repo.includes('@') || repo.includes(':')) {
      throw new GitUrlParseError('Invalid owner or repository name in short format');
    }
    
    // Basic validation - no spaces, reasonable length
    if (owner.includes(' ') || repo.includes(' ') || owner.length === 0 || repo.length === 0) {
      throw new GitUrlParseError('Invalid owner or repository name in short format');
    }
    
    return { owner, repo };
  }

  // If none of the patterns match, throw an error
  throw new GitUrlParseError(
    `Invalid Git URL format. Supported formats:
- SSH: git@github.com:user/repo
- HTTPS: https://github.com/user/repo
- Short: user/repo`
  );
}

/**
 * Validate if a parsed Git URL info looks reasonable
 * 
 * @param gitInfo - The parsed Git URL info
 * @returns true if valid, false otherwise
 */
export function isValidGitInfo(gitInfo: GitUrlInfo): boolean {
  const { owner, repo } = gitInfo;
  
  // Basic validation rules
  if (!owner || !repo) return false;
  if (owner.length === 0 || repo.length === 0) return false;
  if (owner.length > 39 || repo.length > 100) return false; // GitHub limits
  
  // Must contain only valid characters (alphanumeric, hyphens, underscores, dots)
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(owner) || !validPattern.test(repo)) return false;
  
  // Cannot start or end with special characters
  if (/^[._-]|[._-]$/.test(owner) || /^[._-]|[._-]$/.test(repo)) return false;
  
  return true;
}