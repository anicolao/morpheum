import { type LLMClient } from './llmClient';
import { type LLMMetrics, MetricsTracker, estimateTokens } from './metrics';
import { type OAuthManager } from './oauth/manager';

interface GeminiAuthConfig {
  apiKey?: string;
  oauthManager?: OAuthManager;
}

export class GeminiClient implements LLMClient {
  private metricsTracker = new MetricsTracker();

  constructor(
    private readonly auth: GeminiAuthConfig,
    private readonly model: string,
    private readonly baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta'
  ) {}

  getMetrics(): LLMMetrics | null {
    return this.metricsTracker.getMetrics();
  }

  resetMetrics(): void {
    this.metricsTracker.reset();
  }

  async send(prompt: string): Promise<string> {
    const response = await this.sendRequest(prompt, false);
    return response;
  }

  async sendStreaming(prompt: string, onChunk: (chunk: string) => void): Promise<string> {
    const content = await this.sendRequest(prompt, true);
    onChunk(content);
    return content;
  }

  private async sendRequest(prompt: string, isStreaming: boolean): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.auth.apiKey) {
      headers['x-goog-api-key'] = this.auth.apiKey;
    } else if (this.auth.oauthManager) {
      const accessToken = await this.auth.oauthManager.getAccessToken();
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      throw new Error('Gemini authentication is not configured');
    }

    const modelPath = this.model.startsWith('models/') ? this.model : `models/${this.model}`;
    const endpoint = `${this.baseUrl}/${modelPath}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API request failed with status ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join('') || '';

    const inputTokens = estimateTokens(prompt);
    const outputTokens = estimateTokens(content);
    this.metricsTracker.addRequest(inputTokens, outputTokens);

    if (isStreaming) {
      return content;
    }

    return content;
  }
}
