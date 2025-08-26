import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MorpheumBot } from './bot';
import { SWEAgent } from './sweAgent';
import { JailClient } from './jailClient';
import { executeGauntlet, gauntletTasks } from '../gauntlet/gauntlet';

// Mock the gauntlet module to avoid Docker dependencies in tests
vi.mock('../gauntlet/gauntlet', () => ({
  executeGauntlet: vi.fn(),
  gauntletTasks: [
    {
      id: 'test-task-1',
      skill: 'Environment Management & Tooling',
      difficulty: 'Easy',
      prompt: 'Test task for validation',
      successCondition: vi.fn()
    },
    {
      id: 'test-task-2',
      skill: 'Software Development & Refinement',
      difficulty: 'Medium',
      prompt: 'Another test task',
      successCondition: vi.fn()
    }
  ]
}));

// Mock external dependencies
vi.mock('./jailClient');

describe('Gauntlet Integration', () => {
  let bot: MorpheumBot;
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendMessage = vi.fn();
    bot = new MorpheumBot();
    vi.clearAllMocks();
  });

  it('should export gauntlet tasks for bot integration', () => {
    expect(gauntletTasks).toBeDefined();
    expect(Array.isArray(gauntletTasks)).toBe(true);
    expect(gauntletTasks.length).toBeGreaterThan(0);
  });

  it('should export executeGauntlet function for bot integration', () => {
    expect(executeGauntlet).toBeDefined();
    expect(typeof executeGauntlet).toBe('function');
  });

  it('should preserve jail client when switching LLM providers', () => {
    // Create a mock jail client
    const mockJailClient = new JailClient('localhost', 12345);
    
    // Verify that SWEAgent has a currentJailClient getter in the real implementation
    // (This test is just verifying the interface exists, actual behavior is tested in integration)
    const mockSweAgent = new SWEAgent(vi.fn() as any, mockJailClient);
    expect(mockSweAgent.currentJailClient).toBeDefined();
    expect(mockSweAgent.currentJailClient).toBe(mockJailClient);
  });

  it('should handle gauntlet run command with proper argument parsing', async () => {
    const mockExecuteGauntlet = vi.mocked(executeGauntlet);
    mockExecuteGauntlet.mockResolvedValue({
      'test-task': { success: true }
    });

    // Test the gauntlet run command
    await bot.processMessage('!gauntlet run --model test-model --task test-task', 'test-user', mockSendMessage);

    // Verify executeGauntlet was called with correct arguments (default provider is ollama)
    expect(mockExecuteGauntlet).toHaveBeenCalledWith('test-model', 'ollama', 'test-task', false, expect.any(Function));
  });

  it('should handle gauntlet run command without task (all tasks)', async () => {
    const mockExecuteGauntlet = vi.mocked(executeGauntlet);
    mockExecuteGauntlet.mockResolvedValue({
      'test-task': { success: true }
    });

    await bot.processMessage('!gauntlet run --model test-model --verbose', 'test-user', mockSendMessage);

    // Verify executeGauntlet was called with undefined task (all tasks) and verbose=true
    expect(mockExecuteGauntlet).toHaveBeenCalledWith('test-model', 'ollama', undefined, true, expect.any(Function));
  });

  it('should handle gauntlet run command with provider option', async () => {
    const mockExecuteGauntlet = vi.mocked(executeGauntlet);
    mockExecuteGauntlet.mockResolvedValue({
      'test-task': { success: true }
    });

    // Test with OpenAI provider - need to set API key to pass validation
    process.env.OPENAI_API_KEY = 'test-key';
    const testBot = new MorpheumBot();

    await testBot.processMessage('!gauntlet run --model gpt-4 --provider openai --task test-task', 'test-user', mockSendMessage);

    // Verify executeGauntlet was called with openai provider
    expect(mockExecuteGauntlet).toHaveBeenCalledWith('gpt-4', 'openai', 'test-task', false, expect.any(Function));
    
    // Clean up
    delete process.env.OPENAI_API_KEY;
  });

  it('should require model parameter for gauntlet run', async () => {
    await bot.processMessage('!gauntlet run --task test-task', 'test-user', mockSendMessage);

    // Should show error message for missing model
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Error: --model is required')
    );
  });

  it('should validate provider parameter for gauntlet run', async () => {
    await bot.processMessage('!gauntlet run --model test-model --provider invalid', 'test-user', mockSendMessage);

    // Should show error message for invalid provider
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Error: --provider must be either "openai" or "ollama"')
    );
  });

  it('should validate OpenAI provider requirements', async () => {
    // Ensure no OpenAI API key is set
    delete process.env.OPENAI_API_KEY;
    const testBot = new MorpheumBot();

    await testBot.processMessage('!gauntlet run --model gpt-4 --provider openai', 'test-user', mockSendMessage);

    // Should show error about missing API key
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Error: OpenAI provider requires OPENAI_API_KEY environment variable to be set.')
    );
  });

  it('should allow gauntlet execution with openai provider even when current provider is copilot', async () => {
    // Set up environment for copilot to work
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.OPENAI_API_KEY = 'test-key';
    
    // Create a new bot instance with the environment set
    const testBot = new MorpheumBot();
    
    // Switch to copilot provider
    await testBot.processMessage('!llm switch copilot owner/repo', 'test-user', mockSendMessage);
    
    // Clear previous calls
    mockSendMessage.mockClear();

    const mockExecuteGauntlet = vi.mocked(executeGauntlet);
    mockExecuteGauntlet.mockResolvedValue({
      'test-task': { success: true }
    });

    // Try to run gauntlet with openai provider - should work even though current provider is copilot
    await testBot.processMessage('!gauntlet run --model gpt-4 --provider openai', 'test-user', mockSendMessage);

    // Should start gauntlet execution, not show error about copilot incompatibility
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Starting Gauntlet evaluation with provider: openai')
    );

    // Verify executeGauntlet was called with openai provider
    expect(mockExecuteGauntlet).toHaveBeenCalledWith('gpt-4', 'openai', undefined, false, expect.any(Function));
    
    // Clean up
    delete process.env.GITHUB_TOKEN;
    delete process.env.OPENAI_API_KEY;
  });

  it('should prevent gauntlet execution when copilot is requested as provider', async () => {
    // Try to run gauntlet with copilot as the requested provider (should be blocked)
    await bot.processMessage('!gauntlet run --model test-model --provider copilot', 'test-user', mockSendMessage);

    // Should show error about invalid provider
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Error: --provider must be either "openai" or "ollama"')
    );
  });

  it('should display gauntlet results with pass/fail status', async () => {
    const mockExecuteGauntlet = vi.mocked(executeGauntlet);
    mockExecuteGauntlet.mockResolvedValue({
      'task1': { success: true },
      'task2': { success: false },
      'task3': { success: true }
    });

    await bot.processMessage('!gauntlet run --model test-model', 'test-user', mockSendMessage);

    // Should show results with pass/fail status and success rate
    const resultCall = mockSendMessage.mock.calls.find(call => 
      call[0].includes('Gauntlet Evaluation Complete')
    );
    expect(resultCall).toBeDefined();
    expect(resultCall[0]).toContain('2/3 passed');
    expect(resultCall[0]).toContain('67%'); // Success rate
    expect(resultCall[0]).toContain('✅ PASS');
    expect(resultCall[0]).toContain('❌ FAIL');
  });

  it('should provide progress feedback during gauntlet execution', async () => {
    const mockExecuteGauntlet = vi.mocked(executeGauntlet);
    
    // Mock the executeGauntlet function to capture the progress callback
    let capturedProgressCallback: ((message: string, html?: string) => Promise<void>) | null = null;
    mockExecuteGauntlet.mockImplementation(async (model, provider, taskId, verbose, progressCallback) => {
      capturedProgressCallback = progressCallback || null;
      
      // Simulate progress updates if callback is provided
      if (progressCallback) {
        await progressCallback('📊 **Gauntlet Progress Table**\n\n| Task | Status |\n|------|--------|\n| test-task | ⏳ PENDING |');
        await progressCallback('🎯 **Starting Task: test-task**');
        await progressCallback('✅ **Task test-task PASSED**');
      }
      
      return { 'test-task': { success: true } };
    });

    await bot.processMessage('!gauntlet run --model test-model --task test-task', 'test-user', mockSendMessage);

    // Verify that a progress callback was provided
    expect(capturedProgressCallback).toBeTruthy();
    
    // Verify that progress messages were sent
    const progressMessages = mockSendMessage.mock.calls
      .map(call => call[0])
      .filter(msg => 
        msg.includes('Gauntlet Progress Table') || 
        msg.includes('Starting Task:') || 
        msg.includes('PASSED')
      );
    
    expect(progressMessages.length).toBeGreaterThan(0);
    expect(progressMessages.some(msg => msg.includes('Gauntlet Progress Table'))).toBe(true);
    expect(progressMessages.some(msg => msg.includes('Starting Task: test-task'))).toBe(true);
    expect(progressMessages.some(msg => msg.includes('test-task PASSED'))).toBe(true);
  });

  it('should generate progress table with task status correctly', async () => {
    const mockExecuteGauntlet = vi.mocked(executeGauntlet);
    
    // Mock to capture progress messages
    let progressMessages: string[] = [];
    mockExecuteGauntlet.mockImplementation(async (model, provider, taskId, verbose, progressCallback) => {
      if (progressCallback) {
        // Simulate initial progress table (all pending)
        await progressCallback('📊 **Gauntlet Progress Table**\n\n| Task | Status |\n|------|--------|\n| test-task-1 | ⏳ PENDING |\n| test-task-2 | ⏳ PENDING |');
        progressMessages.push('initial-table');
        
        // Simulate first task starting (next)
        await progressCallback('📊 **Gauntlet Progress Table**\n\n| Task | Status |\n|------|--------|\n| test-task-1 | ▶️ NEXT |\n| test-task-2 | ⏳ PENDING |');
        progressMessages.push('first-next');
        
        // Simulate first task completed (pass), second pending
        await progressCallback('📊 **Gauntlet Progress Table**\n\n| Task | Status |\n|------|--------|\n| test-task-1 | ✅ PASS |\n| test-task-2 | ⏳ PENDING |');
        progressMessages.push('first-pass');
        
        // Simulate second task starting (next)
        await progressCallback('📊 **Gauntlet Progress Table**\n\n| Task | Status |\n|------|--------|\n| test-task-1 | ✅ PASS |\n| test-task-2 | ▶️ NEXT |');
        progressMessages.push('second-next');
        
        // Simulate final state (both completed)
        await progressCallback('📊 **Gauntlet Progress Table**\n\n| Task | Status |\n|------|--------|\n| test-task-1 | ✅ PASS |\n| test-task-2 | ❌ FAIL |');
        progressMessages.push('final-state');
      }
      
      return { 
        'test-task-1': { success: true },
        'test-task-2': { success: false }
      };
    });

    await bot.processMessage('!gauntlet run --model test-model', 'test-user', mockSendMessage);

    // Verify all expected progress states were called
    expect(progressMessages).toContain('initial-table');
    expect(progressMessages).toContain('first-next');
    expect(progressMessages).toContain('first-pass');
    expect(progressMessages).toContain('second-next');
    expect(progressMessages).toContain('final-state');
    
    // Verify the table format is correct
    const tableMessages = mockSendMessage.mock.calls
      .map(call => call[0])
      .filter(msg => msg.includes('Gauntlet Progress Table'));
    
    expect(tableMessages.length).toBeGreaterThan(0);
    expect(tableMessages.some(msg => msg.includes('⏳ PENDING'))).toBe(true);
    expect(tableMessages.some(msg => msg.includes('▶️ NEXT'))).toBe(true);
    expect(tableMessages.some(msg => msg.includes('✅ PASS'))).toBe(true);
    expect(tableMessages.some(msg => msg.includes('❌ FAIL'))).toBe(true);
  });
});