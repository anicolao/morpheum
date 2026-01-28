import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as execaModule from 'execa';
import * as llmClientModule from './llmClient';
import * as gauntletModule from '../gauntlet/gauntlet';

// Mock fetch globally to prevent network calls
global.fetch = vi.fn();

// Import after mocks are set up
import { MorpheumBot } from './bot';

describe('MorpheumBot', () => {
  let bot: MorpheumBot;
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.spyOn(fs.promises, 'readFile').mockImplementation((filename: string) => {
      if (filename === 'TASKS.md') {
        return Promise.resolve('# Tasks\n\nThis file tracks the current and upcoming tasks for the Morpheum project.');
      } else if (filename === 'DEVLOG.md') {
        return Promise.resolve('# DEVLOG\n\n## Morpheum Development Log\n\nThis log tracks the development of morpheum.');
      } else if (filename.includes('docs/_tasks/task-100-restructure-tasks-devlog.md')) {
        return Promise.resolve(`---
title: "Restructure TASKS.md and DEVLOG.md to Eliminate Merge Conflicts"
order: 100
status: in-progress
phase: "Morpheum v0.2: Agent Advancement"
category: "Process Improvement"
---

- [x] Analyze current merge conflict issues with centralized TASKS.md and DEVLOG.md files
- [x] Design directory-based structure for individual task and devlog entries
- [ ] Migrate remaining content from existing TASKS.md and DEVLOG.md files`);
      }
      return Promise.resolve('# Test Content\nThis is test content.');
    });
    vi.spyOn(fs.promises, 'readdir').mockImplementation((dirname: string) => {
      if (dirname === 'docs/_tasks') {
        return Promise.resolve(['task-100-restructure-tasks-devlog.md']);
      }
      return Promise.resolve([]);
    });
    vi.spyOn(execaModule, 'execa').mockResolvedValue({
      stdout: 'Container created successfully',
      stderr: '',
    } as any);

    const fakeClient = {
      send: vi.fn().mockResolvedValue('OpenAI response'),
      sendStreaming: vi.fn().mockResolvedValue("<next_step>Job's done!</next_step>"),
      getMetrics: vi.fn().mockReturnValue(null),
      resetMetrics: vi.fn(),
    };
    vi.spyOn(llmClientModule, 'createLLMClient').mockResolvedValue(fakeClient as any);

    // Mock fetch responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('openai') || url.includes('test-openai.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [
              {
                message: {
                  content: 'OpenAI response',
                },
              },
            ],
          }),
        });
      }
      if (url.includes('ollama') || url.includes('test-ollama')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            response: 'Ollama response',
          }),
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
    
    // Set up environment variables for testing
    process.env.OLLAMA_API_URL = 'http://test-ollama:11434';
    process.env.OLLAMA_MODEL = 'test-ollama-model';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.OPENAI_MODEL = 'gpt-4-test';
    process.env.OPENAI_BASE_URL = 'https://test-openai.com/v1';
    process.env.GITHUB_TOKEN = 'test-github-token';
    process.env.MORPHEUM_SKIP_JAIL = '1';
    
    mockSendMessage = vi.fn().mockResolvedValue(undefined);
    bot = new MorpheumBot();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with OpenAI when API key is available', () => {
      expect(bot).toBeDefined();
    });

    it('should fall back to Ollama when no OpenAI key is provided', () => {
      delete process.env.OPENAI_API_KEY;
      const botWithoutOpenAI = new MorpheumBot();
      expect(botWithoutOpenAI).toBeDefined();
    });
  });

  describe('Help Command', () => {
    it('should show help message with all available commands', async () => {
      await bot.processMessage('!help', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Available commands:')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!llm switch')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!openai')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!ollama')
      );
    });
  });

  describe('LLM Status Command', () => {
    it('should show current LLM status', async () => {
      await bot.processMessage('!llm status', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Current Provider: openai'),
        expect.stringContaining('Available Providers')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('model=gpt-4-test'),
        expect.any(String)
      );
    });
  });

  describe('LLM Switch Command', () => {
    it('should switch to Ollama', async () => {
      await bot.processMessage('!llm switch ollama', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Switched to ollama')
      );
    });

    it('should switch to OpenAI with custom model', async () => {
      await bot.processMessage('!llm switch openai gpt-4-turbo', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Switched to openai (model: gpt-4-turbo')
      );
    });

    it('should show error for invalid provider', async () => {
      await bot.processMessage('!llm switch invalid', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Usage: !llm switch <openai|ollama|gemini|copilot>')
      );
    });

    it('should show error when switching to OpenAI without API key', async () => {
      delete process.env.OPENAI_API_KEY;
      const botWithoutKey = new MorpheumBot();
      
      await botWithoutKey.processMessage('!llm switch openai', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('OpenAI API key is not configured')
      );
    });
  });

  describe('Direct OpenAI Command', () => {
    it('should send prompt directly to OpenAI', async () => {
      await bot.processMessage('!openai Hello, how are you?', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith('🤖 OpenAI is thinking...');
      expect(mockSendMessage).toHaveBeenCalledWith('\n✅ OpenAI completed.');
    });

    it('should show usage for empty prompt', async () => {
      await bot.processMessage('!openai', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith('Usage: !openai <prompt>');
    });

    it('should show error when OpenAI key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      const botWithoutKey = new MorpheumBot();
      
      await botWithoutKey.processMessage('!openai test prompt', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('OpenAI API key is not configured')
      );
    });
  });

  describe('Direct Ollama Command', () => {
    it('should send prompt directly to Ollama', async () => {
      await bot.processMessage('!ollama Hello, how are you?', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith('🤖 Ollama is thinking...');
      expect(mockSendMessage).toHaveBeenCalledWith('\n✅ Ollama completed.');
    });

    it('should show usage for empty prompt', async () => {
      await bot.processMessage('!ollama', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith('Usage: !ollama <prompt>');
    });
  });

  describe('Task Processing', () => {
    it('should process regular tasks with current LLM provider', async () => {
      await bot.processMessage('Create a simple hello world program', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Working on: "Create a simple hello world program" using openai (gpt-4-test)...')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Iteration 1: Analyzing and planning...')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Analysis complete. Processing response...')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining("Job's done!")
      );
    });

    it('should detect Job\'s done! in next_step block and complete task', async () => {
      // Mock the OpenAI client to return a response with next_step containing "Job's done!"
      const mockOpenAIClient = {
        send: vi.fn().mockResolvedValue('OpenAI response'),
        sendStreaming: vi.fn().mockImplementation((prompt, onChunk) => {
          const responseWithJobsDone = `<plan>
1. Create the hello world program
2. Test it works
</plan>

<next_step>
Job's done! The program has been created successfully.
</next_step>`;
          return Promise.resolve(responseWithJobsDone);
        }),
      };

      // Create a fresh bot instance for this test to override the mock
      const testBot = new (await import('./bot')).MorpheumBot();
      // Replace the LLM client internally
      (testBot as any).currentLLMClient = mockOpenAIClient;

      await testBot.processMessage('Create a simple hello world program', 'user', mockSendMessage);

      // Verify that the plan was displayed
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('📋 **Plan:**'),
        expect.any(String)
      );

      // Verify that the next step was displayed  
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('🎯 **Next Step:**'),
        expect.any(String)
      );

      // Verify that completion was detected from next_step
      expect(mockSendMessage).toHaveBeenCalledWith("✓ Job's done!");
    });
  });

  describe('File Commands', () => {
    it('should show uncompleted tasks from docs/_tasks directory', async () => {
      await bot.processMessage('!tasks', 'user', mockSendMessage);
      
      // Verify the markdown content is correct
      const [markdown, html] = mockSendMessage.mock.calls[0];
      expect(markdown).toContain('# Tasks (Uncompleted)');
      expect(markdown).toContain('Restructure TASKS.md and DEVLOG.md');
      expect(markdown).toContain('**Status:** in-progress');
      
      // Verify the HTML is correctly generated from the markdown
      expect(html).toContain('<h1>Tasks (Uncompleted)</h1>');
    });

    it('should show devlog from DEVLOG.md', async () => {
      await bot.processMessage('!devlog', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('# DEVLOG'),
        expect.stringContaining('<h1>DEVLOG</h1>')
      );
    });

    it('should show task summary with statistics', async () => {
      await bot.processMessage('!tasks summary', 'user', mockSendMessage);
      
      // Verify the summary content
      const [markdown, html] = mockSendMessage.mock.calls[0];
      expect(markdown).toContain('📊 **Project Summary**');
      expect(markdown).toContain('• **Open Tasks:** 1');
      expect(markdown).toContain('• **Completed Tasks:** 0');
      expect(markdown).toContain('**By Phase:**');
      expect(markdown).toContain('View Full Dashboard');
      
      // Verify HTML formatting
      expect(html).toContain('<strong>Project Summary</strong>');
    });

    it('should search tasks by query', async () => {
      await bot.processMessage('!tasks search Restructure', 'user', mockSendMessage);
      
      // Verify the search results
      const [markdown, html] = mockSendMessage.mock.calls[0];
      expect(markdown).toContain('🔍 **Search Results**');
      expect(markdown).toContain('1 found');
      expect(markdown).toContain('Restructure TASKS.md');
      expect(markdown).toContain('(in-progress)');
      
      // Verify HTML formatting
      expect(html).toContain('<strong>Search Results</strong>');
    });

    it('should show no results for tasks search with no matches', async () => {
      await bot.processMessage('!tasks search nonexistent', 'user', mockSendMessage);
      
      const [markdown] = mockSendMessage.mock.calls[0];
      expect(markdown).toContain('🔍 **Search Results**');
      expect(markdown).toContain('No tasks found matching "nonexistent"');
    });

    it('should show usage help for tasks search without query', async () => {
      await bot.processMessage('!tasks search', 'user', mockSendMessage);
      
      const [message] = mockSendMessage.mock.calls[0];
      expect(message).toBe('Usage: !tasks search <query>');
    });
  });

  describe('Gauntlet Commands', () => {
    it('should show gauntlet help with formatted markdown', async () => {
      await bot.processMessage('!gauntlet help', 'user', mockSendMessage);
      
      // Verify that sendMarkdownMessage was called (should have 2 parameters: markdown + HTML)
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      const call = mockSendMessage.mock.calls[0];
      
      // Should have both markdown and HTML parameters
      expect(call).toHaveLength(2);
      
      // First parameter should be the markdown
      expect(call[0]).toContain('🏆 **Gauntlet - AI Model Evaluation**');
      expect(call[0]).toContain('**Usage:**');
      expect(call[0]).toContain('`!gauntlet run [--model <model>] [--provider <openai|ollama|gemini>] [--task <task>] [--verbose]`');
      
      // Second parameter should be HTML
      expect(call[1]).toContain('<strong>Gauntlet - AI Model Evaluation</strong>');
      expect(call[1]).toContain('<code>!gauntlet run [--model');
    });

    it('should show gauntlet list with formatted markdown', async () => {
      await bot.processMessage('!gauntlet list', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('📋 **Available Gauntlet Tasks:**'),
        expect.stringContaining('<strong>Available Gauntlet Tasks:</strong>')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('**Environment Management & Tooling:**'),
        expect.stringContaining('<strong>Environment Management &amp; Tooling:</strong>')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('`add-jq`'),
        expect.stringContaining('<code>add-jq</code>')
      );
    });

    it('should allow gauntlet run even when current provider is copilot', async () => {
      const mockExecuteGauntlet = vi.spyOn(gauntletModule, 'executeGauntlet').mockResolvedValue({
        'test-task': { success: true }
      });

      // Switch to copilot provider with repository  
      await bot.processMessage('!llm switch copilot owner/repo', 'user', mockSendMessage);
      
      // Verify switch was successful by checking one of the switch message calls
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Switched to copilot')
      );
      mockSendMessage.mockClear();
      
      // Should work even with copilot as current provider, as long as we specify a valid provider
      await bot.processMessage('!gauntlet run --model gpt-4 --provider ollama', 'user', mockSendMessage);
      
      // Should start gauntlet execution, not reject
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Starting Gauntlet evaluation with provider: ollama')
      );
      mockExecuteGauntlet.mockRestore();
    });
  });
});
