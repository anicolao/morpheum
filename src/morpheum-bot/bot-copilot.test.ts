import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MorpheumBot } from './bot';

// Mock all external dependencies
vi.mock('./sweAgent');
vi.mock('./ollamaClient');
vi.mock('./openai');
vi.mock('./jailClient');
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      issues: {
        create: vi.fn().mockResolvedValue({ data: { number: 123 } }),
        createComment: vi.fn().mockResolvedValue({})
      }
    }
  }))
}));

// Mock fs.promises
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn().mockResolvedValue('Mock file content')
  }
}));

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: 'test-container-name' })
}));

describe('MorpheumBot Copilot Integration', () => {
  let bot: MorpheumBot;
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables for testing
    process.env.GITHUB_TOKEN = 'test-github-token';
    process.env.COPILOT_REPOSITORY = 'test-owner/test-repo';
    process.env.COPILOT_POLL_INTERVAL = '0.1';
    
    bot = new MorpheumBot();
    mockSendMessage = vi.fn().mockResolvedValue(undefined);
  });

  it('should show copilot in help command', async () => {
    await bot.processMessage('!help', 'test-user', mockSendMessage);
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('!llm switch copilot <repository>')
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('!copilot status')
    );
  });

  it('should show copilot configuration in status', async () => {
    await bot.processMessage('!llm status', 'test-user', mockSendMessage);
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Copilot: repository=test-owner/test-repo'),
      expect.anything()
    );
  });

  it('should switch to copilot provider', async () => {
    await bot.processMessage('!llm switch copilot test-org/test-repo', 'test-user', mockSendMessage);
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Switched to copilot (repository: test-org/test-repo')
    );
  });

  it('should handle copilot status command', async () => {
    // First switch to copilot
    await bot.processMessage('!llm switch copilot test-org/test-repo', 'test-user', mockSendMessage);
    vi.clearAllMocks();
    
    await bot.processMessage('!copilot status', 'test-user', mockSendMessage);
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Copilot Integration Status')
    );
  });

  it('should handle copilot list command', async () => {
    // First switch to copilot
    await bot.processMessage('!llm switch copilot test-org/test-repo', 'test-user', mockSendMessage);
    vi.clearAllMocks();
    
    await bot.processMessage('!copilot list', 'test-user', mockSendMessage);
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Listing active Copilot sessions')
    );
  });

  it('should require GitHub token for copilot', async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.COPILOT_REPOSITORY;
    
    // Create a new bot instance without GitHub token
    const botWithoutToken = new MorpheumBot();
    
    await botWithoutToken.processMessage('!llm switch copilot test-org/test-repo', 'test-user', mockSendMessage);
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('GitHub token is not configured')
    );
  });

  it('should require repository for copilot switch', async () => {
    // Clear environment variables and create new bot without defaults
    delete process.env.COPILOT_REPOSITORY;
    const botWithoutRepo = new MorpheumBot();
    
    await botWithoutRepo.processMessage('!llm switch copilot', 'test-user', mockSendMessage);
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Repository is required for Copilot')
    );
  });

  it('should reject copilot commands when not in copilot mode', async () => {
    // Start with default provider (not copilot)
    await bot.processMessage('!copilot status', 'test-user', mockSendMessage);
    
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Not currently using Copilot provider')
    );
  });
});