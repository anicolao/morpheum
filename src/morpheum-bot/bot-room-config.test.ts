import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MorpheumBot } from './bot';
import { MatrixClient } from 'matrix-bot-sdk';
import { ProjectRoomConfig } from './project-room-manager';

// Mock the LLM clients to avoid network calls
vi.mock('./copilotClient', () => ({
  CopilotClient: vi.fn().mockImplementation(() => ({
    sendStreaming: vi.fn().mockImplementation(async (prompt: string, onChunk: (chunk: string) => void) => {
      // Simulate a streaming response
      onChunk('Mocked response for: ');
      onChunk(prompt);
      return 'Mocked Copilot response';
    }),
    getMetrics: vi.fn().mockReturnValue(null),
    resetMetrics: vi.fn()
  }))
}));

vi.mock('./ollamaClient', () => ({
  OllamaClient: vi.fn().mockImplementation(() => ({
    sendStreaming: vi.fn().mockImplementation(async (prompt: string, onChunk: (chunk: string) => void) => {
      // Simulate a streaming response
      onChunk('Mocked Ollama response for: ');
      onChunk(prompt);
      return 'Mocked Ollama response';
    }),
    getMetrics: vi.fn().mockReturnValue(null),
    resetMetrics: vi.fn()
  }))
}));

vi.mock('./sweAgent', () => ({
  SWEAgent: vi.fn().mockImplementation(() => ({
    currentJailClient: {
      execute: vi.fn().mockResolvedValue('Mocked jail output')
    }
  }))
}));

describe('MorpheumBot - Room-specific Configuration', () => {
  let bot: MorpheumBot;
  let mockMatrixClient: MatrixClient;
  let mockSendMessage: (message: string, html?: string) => Promise<void>;

  beforeEach(() => {
    // Set up environment variables for testing
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.COPILOT_REPOSITORY = 'global/default';
    
    bot = new MorpheumBot();
    
    // Mock Matrix client
    mockMatrixClient = {
      getRoomStateEvent: vi.fn(),
    } as any;
    
    bot.setMatrixClient(mockMatrixClient);
    
    mockSendMessage = vi.fn().mockResolvedValue(undefined);
  });

  it('should use project-specific configuration in project rooms', async () => {
    const projectRoomId = '!projectroom:test.matrix.org';
    const projectConfig: ProjectRoomConfig = {
      repository: 'facebook/react',
      llmProvider: 'copilot',
      created_by: '@user:test.matrix.org',
      created_at: '2025-01-12T00:00:00.000Z',
      version: '1.0'
    };

    // Mock getRoomStateEvent to return project configuration
    (mockMatrixClient.getRoomStateEvent as any).mockResolvedValue(projectConfig);

    // Spy on the internal methods to verify configuration changes
    const validateApiKeySpy = vi.spyOn(bot as any, 'validateApiKey');
    
    // Process a task message in the project room
    await bot.processMessage(
      'Help me fix this bug',
      '@user:test.matrix.org',
      mockSendMessage,
      projectRoomId
    );

    // Verify that the bot attempted to use Copilot configuration
    expect(validateApiKeySpy).toHaveBeenCalledWith('copilot');
    
    // Verify the sendMessage was called with project-specific info
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('facebook/react')
    );
  });

  it('should use global configuration in non-project rooms', async () => {
    const regularRoomId = '!regularroom:test.matrix.org';

    // Mock getRoomStateEvent to return null (no project configuration)
    (mockMatrixClient.getRoomStateEvent as any).mockRejectedValue(new Error('Not found'));

    // Process a task message in a regular room
    await bot.processMessage(
      'Help me with this task',
      '@user:test.matrix.org',
      mockSendMessage,
      regularRoomId
    );

    // Verify the sendMessage was called with global config (should use ollama with default model)
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('morpheum-local')
    );
  });

  it('should cache room configurations for performance', async () => {
    const projectRoomId = '!projectroom:test.matrix.org';
    const projectConfig: ProjectRoomConfig = {
      repository: 'vercel/next.js',
      llmProvider: 'copilot',
      created_by: '@user:test.matrix.org',
      created_at: '2025-01-12T00:00:00.000Z',
      version: '1.0'
    };

    // Mock getRoomStateEvent to return project configuration
    (mockMatrixClient.getRoomStateEvent as any).mockResolvedValue(projectConfig);

    // Process two messages in the same project room
    await bot.processMessage('First task', '@user:test.matrix.org', mockSendMessage, projectRoomId);
    await bot.processMessage('Second task', '@user:test.matrix.org', mockSendMessage, projectRoomId);

    // Verify that getRoomStateEvent was only called once (due to caching)
    expect(mockMatrixClient.getRoomStateEvent).toHaveBeenCalledTimes(1);
  });

  it('should restore original configuration after processing room-specific task', async () => {
    const projectRoomId = '!projectroom:test.matrix.org';
    const regularRoomId = '!regularroom:test.matrix.org';
    
    const projectConfig: ProjectRoomConfig = {
      repository: 'microsoft/vscode',
      llmProvider: 'copilot',
      created_by: '@user:test.matrix.org',
      created_at: '2025-01-12T00:00:00.000Z',
      version: '1.0'
    };

    // Mock the matrix client to return project config for project room, error for regular room
    (mockMatrixClient.getRoomStateEvent as any).mockImplementation((roomId: string) => {
      if (roomId === projectRoomId) {
        return Promise.resolve(projectConfig);
      }
      return Promise.reject(new Error('Not found'));
    });

    // Process task in project room
    await bot.processMessage('Fix this issue', '@user:test.matrix.org', mockSendMessage, projectRoomId);
    
    // Process task in regular room - should use global config
    await bot.processMessage('Another task', '@user:test.matrix.org', mockSendMessage, regularRoomId);

    // Verify both calls were handled appropriately
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('microsoft/vscode')
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('morpheum-local')
    );
  });

  it('should show project room configuration in !llm status when in project room', async () => {
    const projectRoomId = '!projectroom:test.matrix.org';
    const projectConfig: ProjectRoomConfig = {
      repository: 'facebook/react',
      llmProvider: 'copilot',
      created_by: '@alice:test.matrix.org',
      created_at: '2025-01-12T10:00:00.000Z',
      version: '1.0'
    };

    // Mock getRoomStateEvent to return project configuration
    (mockMatrixClient.getRoomStateEvent as any).mockResolvedValue(projectConfig);

    // Run !llm status in project room
    await bot.processMessage('!llm status', '@user:test.matrix.org', mockSendMessage, projectRoomId);

    // Verify that status includes both global and project room information
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('**Global LLM Configuration:**'),
      expect.anything()
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('**🏗️ Project Room Configuration:**'),
      expect.anything()
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Repository: facebook/react'),
      expect.anything()
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Created by: @alice:test.matrix.org'),
      expect.anything()
    );
  });

  it('should show regular room status in !llm status when in non-project room', async () => {
    const regularRoomId = '!regularroom:test.matrix.org';

    // Mock getRoomStateEvent to return error (no project configuration)
    (mockMatrixClient.getRoomStateEvent as any).mockRejectedValue(new Error('Not found'));

    // Run !llm status in regular room
    await bot.processMessage('!llm status', '@user:test.matrix.org', mockSendMessage, regularRoomId);

    // Verify that status shows global config and regular room status
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('**Global LLM Configuration:**'),
      expect.anything()
    );
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('**Room Status:** Regular room (no project-specific configuration)'),
      expect.anything()
    );
  });
});