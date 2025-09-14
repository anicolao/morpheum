import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally to prevent network calls
global.fetch = vi.fn();

// Mock the modules using vi.hoisted for better mock hoisting
const mockFs = vi.hoisted(() => ({
  promises: {
    readFile: vi.fn().mockImplementation((filename: string) => {
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
    }),
    readdir: vi.fn().mockImplementation((dirname: string) => {
      if (dirname === 'docs/_tasks') {
        return Promise.resolve(['task-100-restructure-tasks-devlog.md']);
      }
      return Promise.resolve([]);
    }),
  },
}));

vi.mock('fs', () => mockFs);

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({
    stdout: 'Container created successfully',
    stderr: '',
  }),
}));

vi.mock('./ollamaClient', () => ({
  OllamaClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue('Ollama response'),
    sendStreaming: vi.fn().mockImplementation((prompt, onChunk) => {
      // Simulate streaming by calling onChunk with parts of the response
      onChunk('Ollama ');
      onChunk('response');
      return Promise.resolve('Ollama response');
    }),
  })),
}));

vi.mock('./openai', () => ({
  OpenAIClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue('OpenAI response'),
    sendStreaming: vi.fn().mockImplementation((prompt, onChunk) => {
      // Simulate streaming by calling onChunk with parts of the response
      onChunk('OpenAI ');
      onChunk('response');
      return Promise.resolve('OpenAI response');
    }),
  })),
}));

vi.mock('./jailClient', () => ({
  JailClient: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue('Command executed'),
  })),
}));

vi.mock('./sweAgent', () => ({
  SWEAgent: vi.fn(() => ({
    run: vi.fn().mockResolvedValue([
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'Test task' },
      { role: 'assistant', content: 'Test response' },
    ]),
  })),
}));

vi.mock('./format-markdown', () => ({
  formatMarkdown: vi.fn((content: string) => {
    // Simple mock that converts the test content to expected HTML
    if (content === '# Test Content\nThis is test content.') {
      return '<h1>Test Content</h1>\n<p>This is test content.</p>\n';
    } else if (content.startsWith('# Tasks (Uncompleted)')) {
      return '<h1>Tasks (Uncompleted)</h1>\n<h3>Restructure TASKS.md and DEVLOG.md to Eliminate Merge Conflicts</h3>\n<p><strong>Status:</strong> in-progress</p>\n';
    } else if (content.startsWith('# Tasks')) {
      return '<h1>Tasks</h1>\n<p>This file tracks the current and upcoming tasks for the Morpheum project.</p>\n';
    } else if (content.startsWith('# DEVLOG')) {
      return '<h1>DEVLOG</h1>\n<h2>Morpheum Development Log</h2>\n<p>This log tracks the development of morpheum.</p>\n';
    } else if (content.includes('🏆 **Gauntlet - AI Model Evaluation**')) {
      return '<p>🏆 <strong>Gauntlet - AI Model Evaluation</strong></p>\n<p><strong>Usage:</strong></p>\n<ul>\n<li><code>!gauntlet run --model &lt;model&gt;</code> - Run gauntlet evaluation</li>\n</ul>\n<p><strong>Options:</strong></p>\n<p><code>--model &lt;model&gt;</code> - Required. The model name to evaluate</p>\n<p>⚠️ <strong>Note:</strong> Gauntlet only works with OpenAI and Ollama providers, not Copilot.</p>';
    } else if (content.includes('📋 **Available Gauntlet Tasks:**')) {
      return '<p>📋 <strong>Available Gauntlet Tasks:</strong></p>\n<p><strong>Environment Management &amp; Tooling:</strong></p>\n<ul>\n<li><code>add-jq</code> (Easy) - Add jq tool for JSON parsing</li>\n</ul>\n<p><strong>Software Development &amp; Refinement:</strong></p>\n<ul>\n<li><code>hello-world-server</code> (Easy) - Create simple web server</li>\n</ul>';
    }
    return '<p>Formatted markdown</p>';
  }),
}));

// Import after mocks are set up
import { MorpheumBot } from './bot';

describe('MorpheumBot', () => {
  let bot: MorpheumBot;
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
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
    
    mockSendMessage = vi.fn().mockResolvedValue(undefined);
    bot = new MorpheumBot();
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
        expect.stringContaining('Matrix Bot Commands:'),
        expect.any(String)
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!llm switch'),
        expect.any(String)
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!openai'),
        expect.any(String)
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!ollama'),
        expect.any(String)
      );
    });
  });

  describe('LLM Status Command', () => {
    it('should show current LLM status', async () => {
      await bot.processMessage('!llm status', 'user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Current Provider: openai'),
        expect.stringContaining('<p>Formatted markdown</p>')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('model=gpt-4-test'),
        expect.stringContaining('<p>Formatted markdown</p>')
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
        expect.stringContaining('Usage: !llm switch <openai|ollama|copilot>')
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
      expect(mockSendMessage).toHaveBeenCalledWith('OpenAI ');
      expect(mockSendMessage).toHaveBeenCalledWith('response');
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
      expect(mockSendMessage).toHaveBeenCalledWith('Ollama ');
      expect(mockSendMessage).toHaveBeenCalledWith('response');
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
      expect(call[0]).toContain('`!gauntlet run --model <model> [--provider <openai|ollama>] [--task <task>] [--verbose]`');
      
      // Second parameter should be HTML
      expect(call[1]).toContain('<strong>Gauntlet - AI Model Evaluation</strong>');
      expect(call[1]).toContain('<code>!gauntlet run --model');
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
      // Mock executeGauntlet first so the test doesn't hang
      const mockExecuteGauntlet = vi.fn().mockResolvedValue({
        'test-task': { success: true }
      });
      vi.doMock('../gauntlet/gauntlet', () => ({
        executeGauntlet: mockExecuteGauntlet
      }));

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
    });
  });
});