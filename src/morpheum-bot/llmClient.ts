import { type LLMMetrics, MetricsTracker } from './metrics';
import { OAuthManager } from './oauth/manager';

/**
 * Common interface for LLM clients (OpenAI, Ollama, etc.)
 */
export interface LLMClient {
  /**
   * Send a prompt to the LLM and get a response
   * @param prompt The text prompt to send
   * @returns Promise that resolves to the LLM's response
   */
  send(prompt: string): Promise<string>;

  /**
   * Send a prompt to the LLM with streaming support
   * @param prompt The text prompt to send
   * @param onChunk Callback function called for each chunk of the response
   * @returns Promise that resolves to the complete LLM response
   */
  sendStreaming(prompt: string, onChunk: (chunk: string) => void): Promise<string>;

  /**
   * Get accumulated metrics for this client
   * @returns Current metrics or null if metrics tracking is not enabled
   */
  getMetrics?(): LLMMetrics | null;

  /**
   * Reset metrics for this client
   */
  resetMetrics?(): void;
}

/**
 * Configuration for different LLM providers
 */
export interface LLMConfig {
  provider: 'openai' | 'ollama' | 'copilot' | 'gemini';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  repository?: string; // New field for GitHub repo (required for copilot)
  oauthManager?: OAuthManager;
}

/**
 * Factory function to create LLM clients based on configuration
 */
export async function createLLMClient(config: LLMConfig): Promise<LLMClient> {
  switch (config.provider) {
    case 'openai':
      const { OpenAIClient } = await import('./openai');
      if (!config.apiKey) {
        throw new Error('OpenAI API key is required');
      }
      return new OpenAIClient(
        config.apiKey,
        config.model || 'gpt-3.5-turbo',
        config.baseUrl || 'https://api.openai.com/v1'
      );
    
    case 'ollama':
      const { OllamaClient } = await import('./ollamaClient');
      return new OllamaClient(
        config.baseUrl || 'http://localhost:11434',
        config.model || 'morpheum-local'
      );
    
    case 'copilot':
      const { CopilotClient } = await import('./copilotClient');
      if (!config.apiKey) {
        throw new Error('GitHub token is required for Copilot integration');
      }
      if (!config.repository) {
        throw new Error('Repository name is required for Copilot integration');
      }
      return new CopilotClient(
        config.apiKey,
        config.repository,
        config.baseUrl || 'https://api.github.com'
      );

    case 'gemini':
      const { GeminiClient } = await import('./geminiClient');
      if (!config.apiKey && !config.oauthManager) {
        throw new Error('Gemini API key or OAuth manager is required');
      }
      return new GeminiClient(
        config.apiKey ? { apiKey: config.apiKey } : { oauthManager: config.oauthManager },
        config.model || 'gemini-3-pro-preview',
        config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
      );
    
    default:
      throw new Error(`Unsupported LLM provider: ${(config as any).provider}`);
  }
}
