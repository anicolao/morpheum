import { describe, it, expect } from 'vitest';
import { createLLMClient, LLMConfig } from './llmClient';
import { OpenAIClient } from './openai';
import { OllamaClient } from './ollamaClient';
import { CopilotClient } from './copilotClient';
import { GeminiClient } from './geminiClient';

describe('LLM Client Factory', () => {
  it('should create OpenAI client with valid config', async () => {
    const config: LLMConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
      baseUrl: 'https://api.openai.com/v1',
    };

    const client = await createLLMClient(config);
    expect(client).toBeInstanceOf(OpenAIClient);
  });

  it('should create Ollama client with valid config', async () => {
    const config: LLMConfig = {
      provider: 'ollama',
      model: 'llama2',
      baseUrl: 'http://localhost:11434',
    };

    const client = await createLLMClient(config);
    expect(client).toBeInstanceOf(OllamaClient);
  });

  it('should create Copilot client with valid config', async () => {
    const config: LLMConfig = {
      provider: 'copilot',
      apiKey: 'ghp_test-token',
      repository: 'owner/repo',
      baseUrl: 'https://api.github.com',
    };

    const client = await createLLMClient(config);
    expect(client).toBeInstanceOf(CopilotClient);
  });

  it('should create Gemini client with valid config', async () => {
    const config: LLMConfig = {
      provider: 'gemini',
      apiKey: 'test-gemini-key',
      model: 'gemini-1.5-pro',
    };

    const client = await createLLMClient(config);
    expect(client).toBeInstanceOf(GeminiClient);
  });

  it('should throw error for OpenAI without API key', async () => {
    const config: LLMConfig = {
      provider: 'openai',
      model: 'gpt-4',
    };

    await expect(createLLMClient(config)).rejects.toThrow('OpenAI API key is required');
  });

  it('should throw error for Copilot without GitHub token', async () => {
    const config: LLMConfig = {
      provider: 'copilot',
      repository: 'owner/repo',
    };

    await expect(createLLMClient(config)).rejects.toThrow('GitHub token is required for Copilot integration');
  });

  it('should throw error for Copilot without repository', async () => {
    const config: LLMConfig = {
      provider: 'copilot',
      apiKey: 'ghp_test-token',
    };

    await expect(createLLMClient(config)).rejects.toThrow('Repository name is required for Copilot integration');
  });

  it('should throw error for Gemini without API key', async () => {
    const config: LLMConfig = {
      provider: 'gemini',
      model: 'gemini-1.5-pro',
    };

    await expect(createLLMClient(config)).rejects.toThrow('Gemini API key or OAuth manager is required');
  });

  it('should throw error for unsupported provider', async () => {
    const config = {
      provider: 'unsupported',
    } as any;

    await expect(createLLMClient(config)).rejects.toThrow('Unsupported LLM provider: unsupported');
  });

  it('should use default values for optional parameters', async () => {
    const openaiConfig: LLMConfig = {
      provider: 'openai',
      apiKey: 'test-key',
    };

    const ollamaConfig: LLMConfig = {
      provider: 'ollama',
    };

    const copilotConfig: LLMConfig = {
      provider: 'copilot',
      apiKey: 'ghp_test-token',
      repository: 'owner/repo',
    };

    const openaiClient = await createLLMClient(openaiConfig);
    const ollamaClient = await createLLMClient(ollamaConfig);
    const copilotClient = await createLLMClient(copilotConfig);

    expect(openaiClient).toBeInstanceOf(OpenAIClient);
    expect(ollamaClient).toBeInstanceOf(OllamaClient);
    expect(copilotClient).toBeInstanceOf(CopilotClient);
  });
});
