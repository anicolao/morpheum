import { SWEAgent } from "./sweAgent";
import { JailClient } from "./jailClient";
import { ensureJailEnvironment } from "./jail-environment";
import { type LLMClient, type LLMConfig, createLLMClient } from "./llmClient";
import { TokenManager } from "./token-manager";
import * as fs from "fs";
import { formatMarkdown } from "./format-markdown";
import type { CopilotClient } from "./copilotClient";
import { getTaskFiles, filterUncompletedTasks, assembleTasksMarkdown, getTaskSummary, searchTasks } from "./task-utils";
import { normalizeArgsArray } from "./dash-normalizer";
import { ProjectRoomManager, ProjectRoomConfig, ProjectRoomCreationOptions } from "./project-room-manager";
import { parseGitUrl } from "./git-url-parser";
import { MatrixClient } from "matrix-bot-sdk";
import { OAuthManager } from "./oauth/manager";
import { SYSTEM_PROMPT } from "./prompts";
import { randomUUID } from "crypto";

type MessageSender = (message: string, html?: string) => Promise<void>;

export interface BotRegistryEntry {
  id: string;
  displayName?: string;
  userId?: string;
}

export interface BotPersonaOptions {
  id?: string;
  displayName?: string;
  systemPrompt?: string;
  llmOverrides?: {
    provider?: 'openai' | 'ollama' | 'copilot' | 'gemini';
    model?: string;
    baseUrl?: string;
  };
}

// Helper function to detect if text contains any markdown formatting
function hasMarkdown(text: string): boolean {
  // Check for various markdown patterns:
  // - Links: [text](url)
  // - Code blocks: ``` or `code`
  // - Bold: **text** or __text__
  // - Italic: *text* or _text_
  // - Headings: # ## ### etc.
  return (
    /\[.+?\]\(https?:\/\/.+?\)/.test(text) ||  // Links
    /```[\s\S]*?```/.test(text) ||             // Code blocks
    /`[^`]+?`/.test(text) ||                   // Inline code
    /\*\*[^*]+?\*\*/.test(text) ||             // Bold with **
    /__[^_]+?__/.test(text) ||                 // Bold with __
    /\*[^*]+?\*/.test(text) ||                 // Italic with *
    /_[^_]+?_/.test(text) ||                   // Italic with _
    /^#{1,6}\s/.test(text.trim())              // Headings
  );
}

// Helper function to send plain text messages explicitly
function sendPlainTextMessage(text: string, sendMessage: MessageSender): Promise<void> {
  return sendMessage(text);
}

// Helper function to send markdown messages with proper HTML formatting - now smart!
function sendMarkdownMessage(markdown: string, sendMessage: MessageSender): Promise<void> {
  if (hasMarkdown(markdown)) {
    const html = formatMarkdown(markdown);
    return sendMessage(markdown, html);
  } else {
    return sendMessage(markdown);
  }
}

export class MorpheumBot {
  private sweAgent?: SWEAgent;
  private sweAgentClient?: LLMClient;
  private tokenManager?: TokenManager;
  private matrixClient?: MatrixClient;
  private projectRoomManager?: ProjectRoomManager;
  private debugMode: boolean;
  private personaId: string;
  private personaDisplayName?: string;
  private systemPrompt: string;
  private availableBots: BotRegistryEntry[] = [];

  private currentLLMClient?: LLMClient;
  private currentLLMClientPromise?: Promise<LLMClient>;
  private currentLLMProvider: 'openai' | 'ollama' | 'copilot' | 'gemini';
  private llmConfig: {
    openai: { apiKey?: string; model: string; baseUrl: string };
    ollama: { model: string; baseUrl: string };
    gemini: { apiKey?: string; model: string; baseUrl: string };
    copilot: { apiKey?: string; repository?: string; baseUrl: string; pollInterval: string };
  };
  private jailClient: JailClient;
  
  // Per-room configurations for project rooms
  private roomConfigs: Map<string, ProjectRoomConfig> = new Map();

  constructor(tokenManager?: TokenManager, debugMode: boolean = false, options?: BotPersonaOptions) {
    this.tokenManager = tokenManager;
    this.debugMode = debugMode;
    this.personaId = options?.id || 'default';
    this.personaDisplayName = options?.displayName;
    this.systemPrompt = options?.systemPrompt || SYSTEM_PROMPT;
    
    // Initialize LLM configurations from environment variables
    const openaiConfig: { apiKey?: string; model: string; baseUrl: string } = {
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    };
    if (process.env.OPENAI_API_KEY) {
      openaiConfig.apiKey = process.env.OPENAI_API_KEY;
    }

    const geminiConfig: { apiKey?: string; model: string; baseUrl: string } = {
      model: process.env.GEMINI_MODEL || 'gemini-3-pro-preview',
      baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    };
    if (process.env.GEMINI_API_KEY) {
      geminiConfig.apiKey = process.env.GEMINI_API_KEY;
    }

    const copilotConfig: { apiKey?: string; repository?: string; baseUrl: string; pollInterval: string } = {
      baseUrl: process.env.COPILOT_BASE_URL || 'https://api.github.com',
      pollInterval: process.env.COPILOT_POLL_INTERVAL || '10',
    };
    if (process.env.GITHUB_TOKEN) {
      copilotConfig.apiKey = process.env.GITHUB_TOKEN;
    }
    if (process.env.COPILOT_REPOSITORY) {
      copilotConfig.repository = process.env.COPILOT_REPOSITORY;
    }

    this.llmConfig = {
      openai: openaiConfig,
      ollama: {
        model: process.env.OLLAMA_MODEL || 'morpheum-local',
        baseUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
      },
      gemini: geminiConfig,
      copilot: copilotConfig,
    };

    // Default to Ollama if no OpenAI key is provided
    this.currentLLMProvider = this.llmConfig.openai.apiKey ? 'openai' : 'ollama';

    const overrideProvider = options?.llmOverrides?.provider;
    const providerToOverride = overrideProvider || this.currentLLMProvider;
    if (overrideProvider) {
      this.currentLLMProvider = overrideProvider;
    }
    if (options?.llmOverrides?.model) {
      this.llmConfig[providerToOverride].model = options.llmOverrides.model;
    }
    if (options?.llmOverrides?.baseUrl) {
      this.llmConfig[providerToOverride].baseUrl = options.llmOverrides.baseUrl;
    }
    
    const jailHost = process.env.JAIL_HOST || "localhost";
    const jailPort = parseInt(process.env.JAIL_PORT || "10001", 10);
    this.jailClient = new JailClient(jailHost, jailPort);
  }

  /**
   * Set the Matrix client for this bot instance (used for project room management)
   */
  setMatrixClient(matrixClient: MatrixClient): void {
    this.matrixClient = matrixClient;
    const githubToken = process.env.GITHUB_TOKEN || this.llmConfig.copilot.apiKey;
    this.projectRoomManager = new ProjectRoomManager(matrixClient, githubToken);
  }

  async setJailClient(jailClient: JailClient): Promise<void> {
    this.jailClient = jailClient;
    const client = await this.getLLMClient();
    this.sweAgent = new SWEAgent(client, jailClient, this.systemPrompt);
    this.sweAgentClient = client;
  }

  setAvailableBots(bots: BotRegistryEntry[]): void {
    this.availableBots = bots;
  }

  /**
   * Validate API key for a specific provider
   */
  private validateApiKey(provider: 'openai' | 'ollama' | 'copilot'): void {
    if (provider === 'openai' && !this.llmConfig.openai.apiKey) {
      throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY environment variable.');
    } else if (provider === 'copilot' && !this.llmConfig.copilot.apiKey) {
      throw new Error('GitHub token is not configured. Set GITHUB_TOKEN environment variable.');
    }
    // Ollama doesn't require an API key
  }

  private getGeminiOAuthManager(): OAuthManager {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const scopesEnv = process.env.GOOGLE_OAUTH_SCOPES;
    const scopes = scopesEnv
      ? scopesEnv.split(' ').map(scope => scope.trim()).filter(Boolean)
      : ['https://www.googleapis.com/auth/generative-language'];

    if (!clientId) {
      throw new Error('Google OAuth client ID is required. Set GOOGLE_OAUTH_CLIENT_ID environment variable.');
    }

    return new OAuthManager('gemini', {
      clientId,
      clientSecret,
      scopes,
      authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    });
  }

  private async validateProviderAuth(provider: 'openai' | 'ollama' | 'copilot' | 'gemini'): Promise<void> {
    if (provider === 'gemini') {
      if (this.llmConfig.gemini.apiKey) {
        return;
      }
      const manager = this.getGeminiOAuthManager();
      const status = await manager.getStatus();
      if (!status.hasRefreshToken && !status.hasAccessToken) {
        throw new Error('Gemini OAuth is not configured. Run `!llm oauth gemini start` to authorize.');
      }
      return;
    }

    this.validateApiKey(provider as 'openai' | 'ollama' | 'copilot');
  }

  /**
   * Configure the bot to use a specific model and provider for gauntlet evaluation
   */
  public async configureForGauntlet(model: string, provider: 'openai' | 'ollama' | 'gemini') {
    await this.validateProviderAuth(provider);
    
    if (provider === 'openai') {
      this.llmConfig.openai.model = model;
      this.currentLLMProvider = 'openai';
    } else if (provider === 'ollama') {
      this.llmConfig.ollama.model = model;
      this.currentLLMProvider = 'ollama';
    } else if (provider === 'gemini') {
      this.llmConfig.gemini.model = model;
      this.currentLLMProvider = 'gemini';
    }
    
    this.resetLLMClient();
    await this.getSWEAgent();
  }

  private buildLLMConfig(): LLMConfig {
    const config: LLMConfig = {
      provider: this.currentLLMProvider,
    };

    if (this.currentLLMProvider === 'openai') {
      config.apiKey = this.llmConfig.openai.apiKey;
      config.model = this.llmConfig.openai.model;
      config.baseUrl = this.llmConfig.openai.baseUrl;
    } else if (this.currentLLMProvider === 'ollama') {
      config.model = this.llmConfig.ollama.model;
      config.baseUrl = this.llmConfig.ollama.baseUrl;
    } else if (this.currentLLMProvider === 'gemini') {
      config.apiKey = this.llmConfig.gemini.apiKey;
      config.model = this.llmConfig.gemini.model;
      config.baseUrl = this.llmConfig.gemini.baseUrl;
      if (!config.apiKey) {
        config.oauthManager = this.getGeminiOAuthManager();
      }
    } else if (this.currentLLMProvider === 'copilot') {
      config.apiKey = this.llmConfig.copilot.apiKey;
      config.repository = this.llmConfig.copilot.repository;
      config.baseUrl = this.llmConfig.copilot.baseUrl;
    }

    return config;
  }

  private resetLLMClient(): void {
    this.currentLLMClient = undefined;
    this.currentLLMClientPromise = undefined;
    this.sweAgent = undefined;
    this.sweAgentClient = undefined;
  }

  private async getLLMClient(): Promise<LLMClient> {
    if (this.currentLLMClient) {
      return this.currentLLMClient;
    }

    if (!this.currentLLMClientPromise) {
      const config = this.buildLLMConfig();
      this.currentLLMClientPromise = createLLMClient(config);
    }

    this.currentLLMClient = await this.currentLLMClientPromise;
    return this.currentLLMClient;
  }

  private async getSWEAgent(): Promise<SWEAgent> {
    const client = await this.getLLMClient();
    if (!this.sweAgent || this.sweAgentClient !== client) {
      this.sweAgent = new SWEAgent(client, this.jailClient, this.systemPrompt);
      this.sweAgentClient = client;
    }
    return this.sweAgent;
  }

  public async processMessage(
    body: string,
    sender: string,
    sendMessage: MessageSender,
    roomId?: string,
  ): Promise<any> {
    // Debug logging: log all received commands if debug mode is enabled
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG] ${timestamp} - Received command from ${sender} in room ${roomId || 'unknown'}: "${body}"`);
    }

    if (body.startsWith("!create")) {
      const port = body.split(" ")[1] || "10001";
      return await this.handleCreateCommand(sendMessage, port);
    } else if (body.startsWith("!project")) {
      await this.handleProjectCommand(body, sendMessage, roomId || '', sender);
    } else if (body.startsWith("!")) {
      await this.handleInfoCommand(body, sendMessage, roomId);
    } else {
      return await this.handleTask(body, sendMessage, roomId);
    }
  }

  private async handleCreateCommand(sendMessage: MessageSender, port: string) {
    try {
      const jailHost = process.env.JAIL_HOST || "localhost";
      const { client, containerName } = await ensureJailEnvironment({
        host: jailHost,
        port: parseInt(port, 10),
        forceCreate: true,
        containerPrefix: "gauntlet-test-",
        readinessAttempts: 60,
        readinessIntervalMs: 1000,
        sendMessage,
      });
      await this.setJailClient(client);
      await sendMessage(`Agent reset to talk to the new container on port ${port}`);
      return containerName;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await sendMessage(`Error creating environment: ${errorMessage}`);
    }
  }

  private async handleInfoCommand(body: string, sendMessage: MessageSender, roomId?: string) {
    if (body.startsWith("!help")) {
      const message = `Hello! I am the Morpheum Bot. I am still under development.

Available commands:
- \`!help\` - Show this help message
- \`!tasks\` - Show current tasks
- \`!tasks summary\` - Show task summary statistics
- \`!tasks search <query>\` - Search tasks by keyword
- \`!devlog\` - Show development log
- \`!tokens\` - Show Matrix authentication token status
- \`!token refresh\` - Manually refresh Matrix authentication token
- \`!bot list\` - List available bot identities in this process
- \`!bot whoami\` - Show the current bot identity
- \`!bot request <bot-id> <task>\` - Post a delegation request to another bot
- \`!llm status\` - Show current LLM provider and configuration
- \`!llm switch openai [model] [baseUrl]\` - Switch to OpenAI (requires OPENAI_API_KEY env var)
- \`!llm switch ollama [model] [baseUrl]\` - Switch to Ollama
- \`!llm switch gemini [model] [baseUrl]\` - Switch to Gemini (API key or OAuth required)
- \`!llm switch copilot <repository>\` - Switch to GitHub Copilot (requires GITHUB_TOKEN env var)
- \`!llm oauth gemini <start|status|revoke>\` - Manage Gemini OAuth loopback flow
- \`!llm gemini models\` - List available Gemini models and supported methods
- \`!openai <prompt>\` - Send a direct prompt to OpenAI (requires API key)
- \`!ollama <prompt>\` - Send a direct prompt to Ollama
- \`!copilot status [session-id]\` - Check copilot session status
- \`!copilot list\` - List active copilot sessions
- \`!copilot cancel <session-id>\` - Cancel a copilot session
- \`!project create <git-url>\` - Create a new project room for a GitHub repository
- \`!project create --new <repo-name>\` - Create a new GitHub repository and project room
- \`!project status <git-url>\` - Show repository statistics and information
- \`!gauntlet help\` - Show gauntlet evaluation help
- \`!gauntlet list\` - List available gauntlet tasks
- \`!gauntlet run [--model <model>] [--provider <openai|ollama|gemini>] [--task <task>]\` - Run gauntlet evaluation (supports Unicode dashes like —model)

For regular tasks, just type your request without a command prefix.`;
      await sendMessage(message);
    } else if (body.startsWith("!tasks")) {
      await this.handleTasksCommand(body, sendMessage);
    } else if (body.startsWith("!devlog")) {
      const content = await fs.promises.readFile("DEVLOG.md", "utf8");
      const html = formatMarkdown(content);
      await sendMessage(content, html);
    } else if (body.startsWith("!tokens")) {
      await this.handleTokensCommand(sendMessage);
    } else if (body.startsWith("!token refresh")) {
      await this.handleTokenRefreshCommand(sendMessage);
    } else if (body.startsWith("!bot")) {
      await this.handleBotCommand(body, sendMessage);
    } else if (body.startsWith("!llm")) {
      await this.handleLLMCommand(body, sendMessage, roomId);
    } else if (body.startsWith("!openai")) {
      await this.handleDirectOpenAICommand(body, sendMessage);
    } else if (body.startsWith("!ollama")) {
      await this.handleDirectOllamaCommand(body, sendMessage);
    } else if (body.startsWith("!copilot")) {
      await this.handleCopilotCommand(body, sendMessage);
    } else if (body.startsWith("!gauntlet")) {
      await this.handleGauntletCommand(body, sendMessage);
    }
  }

  private async handleBotCommand(body: string, sendMessage: MessageSender): Promise<void> {
    const parts = body.split(' ');
    const subcommand = parts[1];

    if (!subcommand || subcommand === 'help') {
      await sendMessage(
        'Usage: !bot <list|whoami|request>\\n' +
          '- !bot list\\n' +
          '- !bot whoami\\n' +
          '- !bot request <bot-id> <task>'
      );
      return;
    }

    if (subcommand === 'list') {
      if (!this.availableBots.length) {
        await sendMessage('No bot registry entries available.');
        return;
      }

      const entries = this.availableBots
        .map((bot) => {
          const label = bot.displayName ? `${bot.id} (${bot.displayName})` : bot.id;
          const mention = bot.userId ? ` -> ${bot.userId}` : '';
          return `- ${label}${mention}`;
        })
        .join('\n');

      await sendMessage(`Available bots:\\n${entries}`);
      return;
    }

    if (subcommand === 'whoami') {
      const label = this.personaDisplayName ? `${this.personaId} (${this.personaDisplayName})` : this.personaId;
      await sendMessage(`Current bot identity: ${label}`);
      return;
    }

    if (subcommand === 'request') {
      const target = parts[2];
      const task = parts.slice(3).join(' ').trim();

      if (!target || !task) {
        await sendMessage('Usage: !bot request <bot-id> <task>');
        return;
      }

      const normalizedTarget = target.toLowerCase();
      const targetEntry = this.availableBots.find((bot) =>
        bot.id.toLowerCase() === normalizedTarget ||
        (bot.userId && bot.userId.toLowerCase() === normalizedTarget) ||
        (bot.displayName && bot.displayName.toLowerCase() === normalizedTarget)
      );

      const mention = targetEntry?.userId || target;
      const taskId = randomUUID();
      const requester = this.personaDisplayName || this.personaId;
      const requestText = `${mention} Request: ${task} (from ${requester}, id: ${taskId})`;
      await sendMessage(requestText);
      return;
    }

    await sendMessage('Usage: !bot <list|whoami|request>');
  }

  private async handleLLMCommand(body: string, sendMessage: MessageSender, roomId?: string) {
    const parts = body.split(' ');
    const subcommand = parts[1];

    if (subcommand === 'gemini' && parts[2] === 'models') {
      try {
        const models = await this.listGeminiModels();
        if (!models.length) {
          await sendMessage('No Gemini models returned by the API.');
          return;
        }

        const formatted = models
          .map((model) => {
            const methods = model.supportedGenerationMethods?.join(', ') || 'unknown';
            return `- ${model.name} (methods: ${methods})`;
          })
          .join('\n');

        await sendMessage(`Gemini models:\n${formatted}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await sendMessage(`Gemini models error: ${errorMessage}`);
      }
      return;
    }

    if (subcommand === 'oauth') {
      const provider = parts[2];
      const action = parts[3];

      if (provider !== 'gemini') {
        await sendMessage('Usage: !llm oauth gemini <start|status|revoke>');
        return;
      }

      if (!action || !['start', 'status', 'revoke'].includes(action)) {
        await sendMessage('Usage: !llm oauth gemini <start|status|revoke>');
        return;
      }

      try {
        const manager = this.getGeminiOAuthManager();

        if (action === 'status') {
          const status = await manager.getStatus();
          const expiresAt = status.expiresAt ? new Date(status.expiresAt).toISOString() : 'unknown';
          await sendMessage(
            `Gemini OAuth status:\n- Refresh token: ${status.hasRefreshToken ? 'configured' : 'not configured'}\n- Access token: ${status.hasAccessToken ? 'present' : 'not present'}\n- Expires at: ${expiresAt}`
          );
          return;
        }

        if (action === 'revoke') {
          await manager.revokeTokens();
          await sendMessage('Gemini OAuth tokens cleared. Run `!llm oauth gemini start` to re-authorize.');
          return;
        }

        const { authorizationUrl, redirectUri, waitForToken } = await manager.createLoopbackAuthorization();
        console.log(`[Gemini OAuth] Redirect URI: ${redirectUri}`);
        await sendMessage(
          `Gemini OAuth started.\n` +
            `Redirect URI (for debugging, do not open): \n\`\`\`\n${redirectUri}\n\`\`\`\n` +
            `1) Open: \n\`\`\`\n${authorizationUrl}\n\`\`\`\n` +
            `2) Sign in and approve access\n` +
            `Waiting for authorization...`
        );

        await waitForToken;

        await sendMessage('Gemini OAuth authorization complete. You can now `!llm switch gemini`.');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await sendMessage(`Gemini OAuth error: ${errorMessage}`);
      }
      return;
    }

    if (subcommand === 'status') {
      // Check for room-specific configuration first
      let projectConfig: ProjectRoomConfig | null = null;
      if (roomId && this.projectRoomManager) {
        // Check cache first
        if (this.roomConfigs.has(roomId)) {
          projectConfig = this.roomConfigs.get(roomId)!;
        } else {
          // Try to fetch from Matrix room state
          try {
            projectConfig = await this.projectRoomManager.getProjectConfig(roomId);
            if (projectConfig) {
              this.roomConfigs.set(roomId, projectConfig);
            }
          } catch (error) {
            // Room doesn't have project configuration - this is normal for non-project rooms
          }
        }
      }

      // Determine current provider and source
      const currentProvider = projectConfig ? projectConfig.llmProvider : this.currentLLMProvider;
      const providerSource = projectConfig ? 'project room configuration' : 'global configuration';
      
      // Start with current provider prominently displayed
      let status = `Current Provider: ${currentProvider} (from ${providerSource})`;

      // Add project room configuration section if available (show first)
      if (projectConfig) {
        status += `\n\n**🏗️ Project Room Configuration:**
This room has project-specific settings that override global config for tasks:
- Repository: ${projectConfig.repository}
- LLM Provider: ${projectConfig.llmProvider}
- Created by: ${projectConfig.created_by}
- Created at: ${projectConfig.created_at}

*Note: Tasks in this room will automatically use Copilot with repository '${projectConfig.repository}'*`;
      }

      let geminiOauthStatus = 'oauth=not configured';
      try {
        const oauthStatus = await this.getGeminiOAuthManager().getStatus();
        geminiOauthStatus = oauthStatus.hasRefreshToken ? 'oauth=configured' : 'oauth=not configured';
      } catch (error) {
        geminiOauthStatus = 'oauth=not configured';
      }

      // Add available providers section
      status += `\n\n**Available Providers:**
- OpenAI: model=${this.llmConfig.openai.model}, baseUrl=${this.llmConfig.openai.baseUrl}, apiKey=${this.llmConfig.openai.apiKey ? 'configured' : 'not configured'}
- Ollama: model=${this.llmConfig.ollama.model}, baseUrl=${this.llmConfig.ollama.baseUrl}
- Gemini: model=${this.llmConfig.gemini.model}, baseUrl=${this.llmConfig.gemini.baseUrl}, apiKey=${this.llmConfig.gemini.apiKey ? 'configured' : 'not configured'}, ${geminiOauthStatus}
- Copilot: repository=${this.llmConfig.copilot.repository || 'not configured'}, baseUrl=${this.llmConfig.copilot.baseUrl}, apiKey=${this.llmConfig.copilot.apiKey ? 'configured' : 'not configured'}`;

      await sendMarkdownMessage(status, sendMessage);
    } else if (subcommand === 'switch') {
      const provider = parts[2] as 'openai' | 'ollama' | 'copilot' | 'gemini';
      if (!provider || !['openai', 'ollama', 'copilot', 'gemini'].includes(provider)) {
        await sendMessage('Usage: !llm switch <openai|ollama|gemini|copilot> [model] [baseUrl] or !llm switch copilot <repository>');
        return;
      }

      try {
        await this.validateProviderAuth(provider);

        if (provider === 'copilot') {
          // For copilot, the third parameter is the repository
          if (parts[3]) {
            this.llmConfig.copilot.repository = parts[3];
          } else if (!this.llmConfig.copilot.repository) {
            await sendMessage('Error: Repository is required for Copilot. Use: !llm switch copilot <owner/repo>');
            return;
          }
        } else {
          // Update configuration if additional parameters provided for openai/ollama
          if (parts[3]) {
            this.llmConfig[provider].model = parts[3];
          }
          if (parts[4]) {
            this.llmConfig[provider].baseUrl = parts[4];
          }
        }

        this.currentLLMProvider = provider;
        this.resetLLMClient();
        await this.getSWEAgent();

        if (provider === 'copilot') {
          await sendMessage(`Switched to ${provider} (repository: ${this.llmConfig.copilot.repository}, baseUrl: ${this.llmConfig.copilot.baseUrl})`);
        } else {
          await sendMessage(`Switched to ${provider} (model: ${this.llmConfig[provider].model}, baseUrl: ${this.llmConfig[provider].baseUrl})`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await sendMessage(`Error switching LLM provider: ${errorMessage}`);
      }
    } else {
      await sendMessage('Usage: !llm <status|switch|oauth> or !llm gemini models');
    }
  }

  private async listGeminiModels(): Promise<{ name: string; supportedGenerationMethods?: string[] }[]> {
    const headers: Record<string, string> = {};

    if (this.llmConfig.gemini.apiKey) {
      headers['x-goog-api-key'] = this.llmConfig.gemini.apiKey;
    } else {
      const oauthManager = this.getGeminiOAuthManager();
      const accessToken = await oauthManager.getAccessToken();
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${this.llmConfig.gemini.baseUrl}/models`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];

    return models.map((model) => ({
      name: model.name,
      supportedGenerationMethods: model.supportedGenerationMethods,
    }));
  }

  private async handleDirectOpenAICommand(body: string, sendMessage: MessageSender) {
    const prompt = body.substring('!openai '.length).trim();
    if (!prompt) {
      await sendMessage('Usage: !openai <prompt>');
      return;
    }

    try {
      this.validateApiKey('openai');
    } catch (error) {
      await sendMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    try {
      const client = await createLLMClient({
        provider: 'openai',
        apiKey: this.llmConfig.openai.apiKey,
        model: this.llmConfig.openai.model,
        baseUrl: this.llmConfig.openai.baseUrl,
      });
      
      await sendMessage(`🤖 OpenAI is thinking...`);
      
      const response = await client.sendStreaming(prompt, (chunk) => {
        // Let the message queue handle batching - just send raw chunks
        sendMessage(chunk).catch(console.error);
      });
      
      await sendMessage(`\n✅ OpenAI completed.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await sendMessage(`Error calling OpenAI: ${errorMessage}`);
    }
  }

  private async handleDirectOllamaCommand(body: string, sendMessage: MessageSender) {
    const prompt = body.substring('!ollama '.length).trim();
    if (!prompt) {
      await sendMessage('Usage: !ollama <prompt>');
      return;
    }

    try {
      const client = await createLLMClient({
        provider: 'ollama',
        model: this.llmConfig.ollama.model,
        baseUrl: this.llmConfig.ollama.baseUrl,
      });
      
      await sendMessage(`🤖 Ollama is thinking...`);
      
      const response = await client.sendStreaming(prompt, (chunk) => {
        // Let the message queue handle batching - just send raw chunks
        sendMessage(chunk).catch(console.error);
      });
      
      await sendMessage(`\n✅ Ollama completed.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await sendMessage(`Error calling Ollama: ${errorMessage}`);
    }
  }

  private async handleCopilotCommand(body: string, sendMessage: MessageSender) {
    const parts = body.split(' ');
    const subcommand = parts[1];

    if (!subcommand) {
      await sendMessage('Usage: !copilot <status|list|cancel> [session-id]');
      return;
    }

    // Ensure we have a copilot client
    if (this.currentLLMProvider !== 'copilot') {
      await sendMessage('Error: Not currently using Copilot provider. Use `!llm switch copilot <repository>` first.');
      return;
    }

    try {
      const copilotClient = (await this.getLLMClient()) as CopilotClient;

      switch (subcommand) {
        case 'status':
          const sessionId = parts[2];
          if (sessionId) {
            await sendMessage(`📊 Checking status for session: ${sessionId}`);
            // TODO: Implement specific session status check
            await sendMessage(`Session ${sessionId} status: in_progress`);
          } else {
            await sendMessage('📊 Copilot Integration Status:\n' +
              `- Provider: ${this.currentLLMProvider}\n` +
              `- Repository: ${this.llmConfig.copilot.repository}\n` +
              `- Base URL: ${this.llmConfig.copilot.baseUrl}\n` +
              `- Token: ${this.llmConfig.copilot.apiKey ? 'configured' : 'not configured'}`);
          }
          break;

        case 'list':
          await sendMessage('📋 Listing active Copilot sessions...');
          const sessions = await copilotClient.getActiveSessions();
          if (sessions.length === 0) {
            await sendMessage('No active Copilot sessions found.');
          } else {
            const sessionList = sessions.map(s => `- ${s.id}: ${s.status}`).join('\n');
            await sendMessage(`Active sessions:\n${sessionList}`);
          }
          break;

        case 'cancel':
          const cancelSessionId = parts[2];
          if (!cancelSessionId) {
            await sendMessage('Usage: !copilot cancel <session-id>');
            return;
          }
          await sendMessage(`❌ Cancelling session: ${cancelSessionId}`);
          const success = await copilotClient.cancelSession(cancelSessionId);
          if (success) {
            await sendMessage(`✅ Session ${cancelSessionId} cancelled successfully.`);
          } else {
            await sendMessage(`❌ Failed to cancel session ${cancelSessionId}.`);
          }
          break;

        default:
          await sendMessage('Usage: !copilot <status|list|cancel> [session-id]');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await sendMessage(`Error executing Copilot command: ${errorMessage}`);
    }
  }

  private async handleTasksCommand(body: string, sendMessage: MessageSender) {
    const parts = body.split(' ');
    const subcommand = parts[1];

    if (!subcommand) {
      // Default behavior - show open tasks
      const allTasks = await getTaskFiles("docs/_tasks");
      const uncompletedTasks = filterUncompletedTasks(allTasks);
      const content = assembleTasksMarkdown(uncompletedTasks);
      const html = formatMarkdown(content);
      await sendMessage(content, html);
      return;
    }

    switch (subcommand) {
      case 'summary':
        await this.handleTasksSummaryCommand(sendMessage);
        break;
      case 'search':
        await this.handleTasksSearchCommand(parts.slice(2), sendMessage);
        break;
      default:
        await sendPlainTextMessage(
          'Unknown tasks subcommand. Available: summary, search',
          sendMessage
        );
    }
  }

  private async handleTasksSummaryCommand(sendMessage: MessageSender): Promise<void> {
    try {
      const summary = await getTaskSummary("docs/_tasks");
      
      const summaryText = `📊 **Project Summary**\n\n` +
        `• **Open Tasks:** ${summary.totalOpen}\n` +
        `• **Completed Tasks:** ${summary.totalCompleted}\n` +
        `• **Active Phases:** ${Object.keys(summary.byPhase).length}\n\n` +
        `**By Phase:**\n` +
        Object.entries(summary.byPhase)
          .map(([phase, count]) => `  • ${phase}: ${count} tasks`)
          .join('\n') +
        `\n\n[View Full Dashboard](https://anicolao.github.io/morpheum/status/tasks/)`;
      
      await sendMarkdownMessage(summaryText, sendMessage);
    } catch (error) {
      await sendPlainTextMessage('Error retrieving task summary.', sendMessage);
    }
  }

  private async handleTasksSearchCommand(args: string[], sendMessage: MessageSender): Promise<void> {
    if (args.length === 0) {
      await sendPlainTextMessage('Usage: !tasks search <query>', sendMessage);
      return;
    }
    
    const query = args.join(' ');
    
    try {
      const results = await searchTasks(query, { status: ['open', 'in-progress'] });
      
      if (results.length === 0) {
        await sendMarkdownMessage(`🔍 **Search Results**\n\nNo tasks found matching "${query}"`, sendMessage);
        return;
      }
      
      const resultText = `🔍 **Search Results** (${results.length} found)\n\n` +
        results.slice(0, 5).map((task, index) => 
          `${index + 1}. **${task.title}** (${task.status})\n   Phase: ${task.phase || 'None'}`
        ).join('\n\n') +
        (results.length > 5 ? `\n\n... and ${results.length - 5} more results` : '') +
        `\n\n[View All Results](https://anicolao.github.io/morpheum/status/tasks/)`;
      
      await sendMarkdownMessage(resultText, sendMessage);
    } catch (error) {
      await sendPlainTextMessage('Error searching tasks.', sendMessage);
    }
  }

  private async handleGauntletCommand(body: string, sendMessage: MessageSender) {
    const parts = body.split(' ');
    const subcommand = parts[1];

    if (subcommand === 'help' || !subcommand) {
      const helpMessage = `🏆 **Gauntlet - AI Model Evaluation**

**Usage:**
- \`!gauntlet run [--model <model>] [--provider <openai|ollama|gemini>] [--task <task>] [--verbose]\` - Run gauntlet evaluation
- \`!gauntlet list\` - List available tasks
- \`!gauntlet help\` - Show this help message

**Options:**
- \`--model <model>\` - Optional. The model name to evaluate (defaults to provider's configured model)
- \`--provider <openai|ollama|gemini>\` - Optional. LLM provider to use (defaults to current provider)
- \`--task <task>\` - Optional. Specific task ID to run (runs all tasks if not specified)
- \`--verbose\` - Optional. Enable verbose output

**Unicode Dash Support:**
All arguments support Unicode dashes (— or –) which are automatically converted to regular dashes.
Examples: \`—model\`, \`–verbose\`, \`—provider\` work the same as \`--model\`, \`--verbose\`, \`--provider\`.

**Available Tasks:**
- \`add-jq\` - Add jq tool to environment (Easy)
- \`check-sed-available\` - Check sed tool availability (Easy) 
- \`create-project-dir\` - Create project directory (Easy)
- \`add-xml-converter\` - Create XML to JSON converter (Medium)
- \`resolve-python-dependency\` - Fix Python dependency issue (Hard)
- \`hello-world-server\` - Create web server (Easy)
- \`create-hugo-site\` - Create Hugo static site (Medium)
- \`refine-existing-codebase\` - Refine existing code (Hard)

**Examples:**
- \`!gauntlet run --model gpt-4 --provider openai\` - Run all tasks with GPT-4 via OpenAI
- \`!gauntlet run --model llama2 --provider ollama --task add-jq\` - Run specific task with Ollama
- \`!gauntlet run --provider gemini\` - Run with Gemini using the default configured model
- \`!gauntlet run --model gemini-3-pro-preview --provider gemini\` - Run with a specific Gemini model

⚠️ **Note:** Gauntlet works with OpenAI, Ollama, and Gemini providers, not Copilot.`;
      await sendMarkdownMessage(helpMessage, sendMessage);
      return;
    }

    if (subcommand === 'list') {
      const tasksMessage = `📋 **Available Gauntlet Tasks:**

**Environment Management & Tooling:**
- \`add-jq\` (Easy) - Add jq tool for JSON parsing
- \`check-sed-available\` (Easy) - Verify sed tool availability  
- \`create-project-dir\` (Easy) - Create project directory
- \`add-xml-converter\` (Medium) - Create XML to JSON converter
- \`resolve-python-dependency\` (Hard) - Fix missing Python dependencies

**Software Development & Refinement:**
- \`hello-world-server\` (Easy) - Create simple web server
- \`create-hugo-site\` (Medium) - Set up Hugo static site
- \`refine-existing-codebase\` (Hard) - Improve existing code

Use \`!gauntlet run [--model <model>] --task <task-id>\` to run a specific task.`;
      await sendMarkdownMessage(tasksMessage, sendMessage);
      return;
    }

    if (subcommand === 'run') {
      await this.runGauntletEvaluation(parts.slice(2), sendMessage);
      return;
    }

    await sendMessage('Usage: !gauntlet <run|list|help>');
  }

  private async runGauntletEvaluation(args: string[], sendMessage: MessageSender) {
    // Parse arguments - normalize Unicode dashes first
    const normalizedArgs = normalizeArgsArray(args);
    
    let model: string | null = null;
    const defaultProvider = ['openai', 'ollama', 'gemini'].includes(this.currentLLMProvider)
      ? this.currentLLMProvider
      : 'ollama';
    let provider: 'openai' | 'ollama' | 'gemini' = defaultProvider as 'openai' | 'ollama' | 'gemini';
    let task: string | null = null;
    let verbose = false;

    for (let i = 0; i < normalizedArgs.length; i++) {
      if (normalizedArgs[i] === '--model' || normalizedArgs[i] === '-m') {
        model = normalizedArgs[i + 1] || null;
        i++; // Skip next argument
      } else if (normalizedArgs[i] === '--provider' || normalizedArgs[i] === '-p') {
        const providerArg = normalizedArgs[i + 1];
        if (providerArg && ['openai', 'ollama', 'gemini'].includes(providerArg)) {
          provider = providerArg as 'openai' | 'ollama' | 'gemini';
        } else {
          await sendMessage('Error: --provider must be either "openai", "ollama", or "gemini"');
          return;
        }
        i++; // Skip next argument
      } else if (normalizedArgs[i] === '--task' || normalizedArgs[i] === '-t') {
        task = normalizedArgs[i + 1] || null;
        i++; // Skip next argument
      } else if (normalizedArgs[i] === '--verbose' || normalizedArgs[i] === '-v') {
        verbose = true;
      }
    }

    if (!model) {
      if (provider === 'openai') {
        model = this.llmConfig.openai.model;
      } else if (provider === 'gemini') {
        model = this.llmConfig.gemini.model;
      } else {
        model = this.llmConfig.ollama.model;
      }
    }

    // Validate provider requirements
    try {
      await this.validateProviderAuth(provider);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await sendMessage(`Error: ${errorMessage}`);
      return;
    }

    try {
      await sendMessage(`🏆 Starting Gauntlet evaluation with provider: ${provider}, model: ${model}${task ? ` (task: ${task})` : ' (all tasks)'}...`);
      
      await sendMessage('⚠️ Gauntlet evaluation is a complex process that requires Docker containers. This may take several minutes...');
      
      // Import and execute the actual gauntlet
      const { executeGauntlet } = await import('../gauntlet/gauntlet');
      
      await sendMessage('🔧 Executing gauntlet evaluation...');
      
      const results = await executeGauntlet(
        model, 
        provider, 
        task || undefined, 
        verbose,
        async (progressMessage: string, html?: string) => {
          await sendMarkdownMessage(progressMessage, sendMessage);
        }
      );
      
      // Format and display results
      const resultSummary = Object.entries(results)
        .map(([taskId, result]) => `- ${taskId}: ${result.success ? '✅ PASS' : '❌ FAIL'}`)
        .join('\n');
      
      const passCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.values(results).length;
      
      const resultsMessage = `🏆 **Gauntlet Evaluation Complete!**

**Model:** ${model}
**Tasks:** ${task || 'All tasks'}
**Results:** ${passCount}/${totalCount} passed

${resultSummary}

📊 **Success Rate:** ${totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0}%`;

      await sendMarkdownMessage(resultsMessage, sendMessage);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await sendMessage(`❌ Error running gauntlet: ${errorMessage}`);
    }
  }

  /**
   * Handle !project command - manage project rooms
   */
  private async handleProjectCommand(body: string, sendMessage: MessageSender, roomId: string, userId: string) {
    if (!this.projectRoomManager) {
      await sendMessage('❌ Project room functionality is not available. Matrix client not configured.');
      return;
    }

    const parts = body.split(' ');
    const subcommand = parts[1];

    if (subcommand === 'create') {
      await this.handleProjectCreate(parts.slice(2), sendMessage, roomId, userId);
    } else if (subcommand === 'status') {
      await this.handleProjectStatus(parts.slice(2), sendMessage, roomId, userId);
    } else if (subcommand === 'help') {
      const helpMessage = `🏗️  **Project Room Management**

**Create a project room:**
\`!project create <git-url>\`
\`!project create --new <repo-name>\`

**Get repository statistics:**
\`!project status <git-url>\`

**Supported URL formats:**
- SSH: git@github.com:user/repo
- HTTPS: https://github.com/user/repo
- Short: user/repo

**Examples:**
- \`!project create git@github.com:facebook/react\`
- \`!project create https://github.com/vercel/next.js\`
- \`!project create microsoft/vscode\`
- \`!project create --new my-awesome-project\`
- \`!project status facebook/react\`

**Features:**
✅ Automatic GitHub Copilot integration
✅ Private invite-only rooms
✅ Project-specific AI context
✅ Persistent configuration
✅ Create new repositories with --new flag
✅ Repository statistics and information`;

      await sendMarkdownMessage(helpMessage, sendMessage);
    } else {
      await sendMessage('Usage: !project <create|status|help>\\nUse `!project help` for detailed information.');
    }
  }

  /**
   * Handle project room creation
   */
  private async handleProjectCreate(args: string[], sendMessage: MessageSender, roomId: string, userId: string) {
    // Normalize Unicode dashes (e.g., em dash — to double dash --) 
    const normalizedArgs = normalizeArgsArray(args);
    
    // Parse arguments for --new flag
    const isNewRepository = normalizedArgs.includes('--new');
    const filteredArgs = normalizedArgs.filter(arg => arg !== '--new');

    if (filteredArgs.length === 0) {
      await sendMessage('❌ Repository name or Git URL is required.\n\nUsage:\n- `!project create <git-url>` (for existing repositories)\n- `!project create --new <repo-name>` (to create new repository)\n\nExample: `!project create --new my-awesome-project`');
      return;
    }

    let gitUrl = filteredArgs[0]!;
    let options: ProjectRoomCreationOptions | undefined;

    // If --new flag is present, we need to construct the GitHub URL and set options
    if (isNewRepository) {
      const repoName = gitUrl;
      
      // Check if user passed a Git URL instead of just a repository name
      if (repoName.includes('/') || repoName.includes('@') || repoName.includes(':')) {
        // Try to parse as Git URL to see if it's a valid Git URL format
        try {
          const gitInfo = parseGitUrl(repoName);
          await sendMessage(`❌ It looks like you provided a Git URL for an existing repository: "${repoName}"

**For existing repositories, use:**
\`!project create ${repoName}\`

**For creating new repositories, use:**
\`!project create --new ${gitInfo.repo}\`

The \`--new\` flag creates a new repository under your GitHub account, so you only need to specify the repository name (e.g., "${gitInfo.repo}").`);
          return;
        } catch (error) {
          // If it's not a valid Git URL, fall through to the general validation error
        }
      }
      
      // Validate repository name for new repository creation
      if (!/^[a-zA-Z0-9._-]+$/.test(repoName)) {
        await sendMessage('Invalid repository name for new repository creation.\n\nFor creating new repositories:\nRepository names can only contain alphanumeric characters, dots, hyphens, and underscores.\nExample: !project create --new my-awesome-project\n\nFor existing repositories:\nUse !project create <git-url> instead.\nSupported formats: owner/repo, git@github.com:owner/repo, https://github.com/owner/repo');
        return;
      }

      // Get current GitHub user to construct the URL
      try {
        // We'll use the current user's username from GitHub token
        // For now, we'll use a placeholder that will be resolved in the ProjectRoomManager
        gitUrl = `__NEW_REPO__/${repoName}`;
        
        options = {
          createRepository: true,
          repositoryOptions: {
            name: repoName,
            description: `Created via Morpheum Bot for project room`,
            private: false,
            auto_init: true,
          }
        };
      } catch (error) {
        await sendMessage('❌ Failed to process new repository request. Make sure GITHUB_TOKEN is configured.');
        return;
      }
    }
    
    try {
      await sendMessage(isNewRepository ? '🔨 Creating new GitHub repository and project room...' : '🔨 Creating project room...');
      
      // Create the project room (and optionally the repository)
      const creationResult = await this.projectRoomManager!.createProjectRoom(gitUrl, userId, options);
      
      if (!creationResult.success) {
        await sendMessage(`❌ ${creationResult.error}`);
        return;
      }

      const { roomId: newRoomId, projectName, repositoryCreated, repositoryUrl } = creationResult;
      
      // Invite the user to the new room
      const invitationResult = await this.projectRoomManager!.inviteUserToRoom(newRoomId!, userId);
      
      if (!invitationResult.success) {
        const message = repositoryCreated 
          ? `✅ Repository and project room '${projectName}' created, but failed to invite you: ${invitationResult.error}\\nRepository: ${repositoryUrl}\\nPlease join manually: ${newRoomId}`
          : `✅ Project room '${projectName}' created, but failed to invite you: ${invitationResult.error}\\nPlease join manually: ${newRoomId}`;
        await sendMessage(message);
        return;
      }

      // Store room configuration locally for quick access
      const projectConfig = await this.projectRoomManager!.getProjectConfig(newRoomId!);
      if (projectConfig) {
        this.roomConfigs.set(newRoomId!, projectConfig);
      }

      // Send confirmation message in the original room
      if (repositoryCreated) {
        await sendMessage(`✅ **GitHub repository and project room '${projectName}' created!**\\n🔗 Repository: ${repositoryUrl}\\n👥 You've been invited to join the project room.`);
      } else {
        await sendMessage(`✅ Project room '${projectName}' created! You've been invited to join.`);
      }

      // Send welcome message in the new room
      const repoUrl = repositoryUrl || gitUrl;
      await this.projectRoomManager!.sendWelcomeMessage(newRoomId!, projectConfig?.repository || repoUrl);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await sendMessage(`❌ Unexpected error creating project room: ${errorMessage}`);
    }
  }

  /**
   * Handle project status command
   */
  private async handleProjectStatus(args: string[], sendMessage: MessageSender, roomId: string, userId: string) {
    if (args.length === 0) {
      await sendMessage('❌ Git URL is required. Usage: !project status <git-url>\\nExample: !project status facebook/react');
      return;
    }

    const gitUrl = args[0]!;
    
    try {
      await sendMessage('📊 Fetching repository statistics...');
      
      const stats = await this.projectRoomManager!.getRepositoryStats(gitUrl);
      
      // Format the statistics into a nice markdown message
      const { repository, commitCount, contributors, lastCommit } = stats;
      
      // Format last commit date
      const lastCommitDate = lastCommit ? new Date(lastCommit.author.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'Never';

      // Format contributors list
      const contributorsList = contributors.length > 0 
        ? contributors.slice(0, 5).map((c, i) => `${i + 1}. **${c.login}** (${c.contributions} commits)`).join('\\n')
        : 'No contributors found';

      // Show only top 5 contributors, indicate if there are more
      const contributorsNote = contributors.length > 5 
        ? `\\n*...and ${contributors.length - 5} more contributors*`
        : '';

      const statusMessage = `📊 **Repository Statistics for ${repository.full_name}**

**📈 Activity:**
- **Commits:** ${commitCount.toLocaleString()}
- **Last Commit:** ${lastCommitDate}
- **Created:** ${new Date(repository.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
- **Last Updated:** ${new Date(repository.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

**👥 Top Contributors:**
${contributorsList}${contributorsNote}

**📋 Repository Info:**
- **Description:** ${repository.description || '*No description provided*'}
- **License:** ${repository.license ? repository.license.name : '*No license specified*'}
- **Default Branch:** ${repository.default_branch}
- **Visibility:** ${repository.private ? 'Private' : 'Public'}

**🔗 Links:**
- **Repository:** https://github.com/${repository.full_name}
- **Clone URL:** ${repository.clone_url}`;

      if (lastCommit) {
        const commitMessage = lastCommit.message.split('\\n')[0]; // First line only
        const shortSha = lastCommit.sha.substring(0, 7);
        const commitUrl = `https://github.com/${repository.full_name}/commit/${lastCommit.sha}`;
        
        const lastCommitInfo = `

**📝 Last Commit:**
- **Message:** [${commitMessage}](${commitUrl})
- **Author:** ${lastCommit.author.name}
- **SHA:** [\`${shortSha}\`](${commitUrl})`;
        
        await sendMarkdownMessage(statusMessage + lastCommitInfo, sendMessage);
      } else {
        await sendMarkdownMessage(statusMessage, sendMessage);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
        await sendMessage(`❌ Repository not found: ${gitUrl}\\nPlease check the URL and ensure the repository exists and is accessible.`);
      } else if (errorMessage.includes('API rate limit')) {
        await sendMessage('❌ GitHub API rate limit exceeded. Please try again later.');
      } else if (errorMessage.includes('token not configured')) {
        await sendMessage('❌ GitHub token not configured. Please set the GITHUB_TOKEN environment variable to access repository statistics.');
      } else {
        await sendMessage(`❌ Error fetching repository statistics: ${errorMessage}`);
      }
    }
  }

  /**
   * Apply room-specific configuration if the room has project configuration
   * Returns the original configuration state to restore later
   */
  private async applyRoomSpecificConfig(roomId?: string): Promise<{
    provider: 'openai' | 'ollama' | 'copilot' | 'gemini';
    repository?: string;
    client: LLMClient;
  } | null> {
    if (!roomId || !this.projectRoomManager) {
      return null;
    }

    // Check if this room has project configuration
    let projectConfig: ProjectRoomConfig | null = null;
    
    // First check our local cache
    if (this.roomConfigs.has(roomId)) {
      projectConfig = this.roomConfigs.get(roomId)!;
    } else {
      // If not in cache, try to fetch from Matrix room state
      try {
        projectConfig = await this.projectRoomManager.getProjectConfig(roomId);
        if (projectConfig) {
          this.roomConfigs.set(roomId, projectConfig);
        }
      } catch (error) {
        // Room doesn't have project configuration or we can't access it
        return null;
      }
    }

    if (!projectConfig || projectConfig.llmProvider !== 'copilot') {
      return null;
    }

    // Save original configuration
    const originalConfig = {
      provider: this.currentLLMProvider,
      repository: this.llmConfig.copilot.repository,
      client: await this.getLLMClient()
    };

    // Apply project room configuration
    try {
      this.validateApiKey('copilot');
      
      // Update configuration for this project
      this.llmConfig.copilot.repository = projectConfig.repository;
      this.currentLLMProvider = 'copilot';
      
      this.resetLLMClient();
      await this.getSWEAgent();
      
      return originalConfig;
    } catch (error) {
      // If we can't switch to copilot, revert to original config
      console.error('[ProjectRoom] Failed to apply project configuration:', error);
      return null;
    }
  }

  /**
   * Restore the original configuration after processing a room-specific task
   */
  private async restoreOriginalConfig(originalConfig: {
    provider: 'openai' | 'ollama' | 'copilot' | 'gemini';
    repository?: string;
    client: LLMClient;
  }): Promise<void> {
    try {
      // Restore original configuration
      this.currentLLMProvider = originalConfig.provider;
      this.llmConfig.copilot.repository = originalConfig.repository;
      this.currentLLMClient = originalConfig.client;
      this.currentLLMClientPromise = Promise.resolve(originalConfig.client);
      this.sweAgent = new SWEAgent(originalConfig.client, this.jailClient, this.systemPrompt);
      this.sweAgentClient = originalConfig.client;
    } catch (error) {
      console.error('[ProjectRoom] Failed to restore original configuration:', error);
    }
  }

  private async handleTask(task: string, sendMessage: MessageSender, roomId?: string) {
    // Check for room-specific configuration and apply if present
    const originalConfig = await this.applyRoomSpecificConfig(roomId);
    
    try {
      const identifier = this.currentLLMProvider === 'copilot' 
        ? this.llmConfig.copilot.repository 
        : this.llmConfig[this.currentLLMProvider].model;
      
      await sendMessage(`🚀 Working on: "${task}" using ${this.currentLLMProvider} (${identifier})...`);

      if (this.currentLLMProvider !== 'copilot') {
        await this.ensureJailEnvironmentForTask(sendMessage);
      }
      
      // Create a streaming version of the SWE agent run
      await this.runSWEAgentWithStreaming(task, sendMessage);
    } finally {
      // Restore original configuration
      if (originalConfig) {
        await this.restoreOriginalConfig(originalConfig);
      }
    }
  }

  private async runSWEAgentWithStreaming(task: string, sendMessage: MessageSender): Promise<{ role: string; content: string }[]> {
    // Special handling for Copilot - it doesn't use the iterative SWE agent pattern
    if (this.currentLLMProvider === 'copilot') {
      return this.runCopilotSession(task, sendMessage);
    }

    const MAX_ITERATIONS = 10;
    const conversationHistory: { role: string; content: string }[] = [];
    
    // For non-Copilot providers, we include the system prompt for proper context
    const { SYSTEM_PROMPT } = await import('./prompts');
    conversationHistory.push({ role: 'system', content: SYSTEM_PROMPT });
    conversationHistory.push({ role: 'user', content: task });

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      await sendMessage(`🧠 Iteration ${i + 1}: Analyzing and planning...`);
      
      const prompt = conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n\n');
      
      // Call LLM without streaming chunks to user - we'll show structured progress instead
      const client = await this.getLLMClient();
      const modelResponse = await client.sendStreaming(prompt, () => {
        // Don't send chunks to user to avoid verbose output
      });
      
      await sendMessage(`💭 Analysis complete. Processing response...`);
      conversationHistory.push({ role: 'assistant', content: modelResponse });

      // Parse and display plan and next step from response
      const { parseBashCommands, parsePlanAndNextStep } = await import('./responseParser');
      const { plan, nextStep } = parsePlanAndNextStep(modelResponse);
      
      // Display plan if found (typically on first iteration)
      if (plan) {
        const planMarkdown = `📋 **Plan:**

${plan}`;
        await sendMarkdownMessage(planMarkdown, sendMessage);
      }
      
      // Display next step if found
      if (nextStep) {
        const nextStepMarkdown = `🎯 **Next Step:**

${nextStep}`;
        await sendMarkdownMessage(nextStepMarkdown, sendMessage);
        
        // Check for task completion phrase in next step
        if (nextStep.includes("Job's done!")) {
          await sendMessage("✓ Job's done!");
          break;
        }
      }

      // Parse bash commands from response
      const commands = parseBashCommands(modelResponse);

      if (commands.length > 0) {
        const isMultiline = commands[0]!.includes('\n');
        const formattedCommand = isMultiline 
          ? `\n\`\`\`\n${commands[0]!}\n\`\`\``
          : `\`${commands[0]!}\``;
        const executingCommandMarkdown = `⚡ **Executing command:** ${formattedCommand}`;
        await sendMarkdownMessage(executingCommandMarkdown, sendMessage);
        
        const sweAgent = await this.getSWEAgent();
        const commandOutput = await sweAgent.currentJailClient.execute(commands[0]!);
        conversationHistory.push({ role: 'tool', content: commandOutput });
        
        // Smart output display: show small outputs directly, large outputs with prefix + spoiler
        const lines = commandOutput.split('\n');
        const lineCount = lines.length;
        const charCount = commandOutput.length;
        
        // Thresholds for direct display
        const maxDirectLines = 50;
        const maxDirectChars = 5000;
        
        if (lineCount < maxDirectLines && charCount < maxDirectChars) {
          // Small output: display directly
          const directOutputMarkdown = `📋 **Command output:**

\`\`\`
${commandOutput}
\`\`\``;
          await sendMarkdownMessage(directOutputMarkdown, sendMessage);
        } else {
          // Large output: show prefix + spoiler
          const maxPrefixLines = 15;
          const maxPrefixChars = 1500;
          
          // Get prefix (either first 15 lines or first 1500 chars, whichever comes first)
          let prefixLines = lines.slice(0, maxPrefixLines);
          let prefix = prefixLines.join('\n');
          
          if (prefix.length > maxPrefixChars) {
            // If 15 lines exceed 1500 chars, truncate to 1500 chars
            prefix = commandOutput.slice(0, maxPrefixChars);
            // Try to end at a line boundary if possible
            const lastNewline = prefix.lastIndexOf('\n');
            if (lastNewline > maxPrefixChars * 0.8) { // Only if we're not losing too much
              prefix = prefix.slice(0, lastNewline);
            }
          }
          
          // Prepare spoiler content (truncate to 64k if needed)
          const maxSpoilerLength = 64000;
          const spoilerContent = commandOutput.length > maxSpoilerLength 
            ? commandOutput.slice(0, maxSpoilerLength) + '\n...(output truncated due to size limit)'
            : commandOutput;
          
          const prefixWithSpoilerMarkdown = `📋 **Command output:**

\`\`\`
${prefix}
${prefix.length < commandOutput.length ? '\n...(showing first ' + prefix.length + ' characters)' : ''}
\`\`\`

\`\`\`
${spoilerContent}
\`\`\``;
          
          await sendMarkdownMessage(prefixWithSpoilerMarkdown, sendMessage);
        }
        
        // Check for early termination phrase
        if (commandOutput.includes("Job's done!")) {
          await sendMessage("✓ Job's done!");
          break;
        }
      } else {
        // If the model doesn't return a command, we assume it's done.
        await sendMessage("✓ Job's done!");
        break;
      }
    }

    return conversationHistory;
  }

  /**
   * Handle Copilot sessions with a simplified workflow focused on issue resolution
   */
  private async runCopilotSession(task: string, sendMessage: MessageSender): Promise<{ role: string; content: string }[]> {
    const conversationHistory: { role: string; content: string }[] = [];
    conversationHistory.push({ role: 'user', content: task });

    // For Copilot, we send just the user's task without system prompts
    // since Copilot already understands repository context
    // The CopilotClient handles all status updates including issue creation
    const client = await this.getLLMClient();
    const response = await client.sendStreaming(task, async (chunk) => {
      // Handle special dual messages for iframe content
      if (chunk.startsWith('__DUAL_MESSAGE__')) {
        try {
          const data = JSON.parse(chunk.substring('__DUAL_MESSAGE__'.length));
          // Send both text and HTML versions for Matrix clients
          await sendMessage(data.text, data.html);
        } catch (error) {
          console.error('Failed to parse dual message:', error);
          // Fallback to treating it as regular text
          await sendMarkdownMessage(chunk, sendMessage);
        }
      } else {
        // Use smart message routing to automatically detect and format markdown content
        await sendMarkdownMessage(chunk, sendMessage);
      }
    });
    
    conversationHistory.push({ role: 'assistant', content: response });
    return conversationHistory;
  }

  private async ensureJailEnvironmentForTask(sendMessage: MessageSender): Promise<void> {
    if (process.env.MORPHEUM_SKIP_JAIL === '1') {
      return;
    }

    const jailHost = process.env.JAIL_HOST || "localhost";
    const jailPort = parseInt(process.env.JAIL_PORT || "10001", 10);
    const allowCreate = jailHost === "localhost" || jailHost === "127.0.0.1";

    try {
      const { client } = await ensureJailEnvironment({
        host: jailHost,
        port: jailPort,
        forceCreate: false,
        allowCreate,
        containerPrefix: "morpheum-run-",
        readinessAttempts: 60,
        readinessIntervalMs: 1000,
        sendMessage,
      });
      await this.setJailClient(client);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await sendMessage(`❌ Failed to initialize environment: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Handle !tokens command - show token status without revealing values
   */
  private async handleTokensCommand(sendMessage: MessageSender) {
    if (!this.tokenManager) {
      await sendMessage(
        `Matrix Token Status: Static token mode
- Authentication: Using ACCESS_TOKEN environment variable
- Automatic refresh: Not available (requires MATRIX_USERNAME and MATRIX_PASSWORD)
- Recommendation: Set MATRIX_USERNAME and MATRIX_PASSWORD environment variables to enable automatic token refresh`
      );
      return;
    }

    const status = this.tokenManager.getTokenStatus();
    const statusMessage = `Matrix Token Status:
- Access Token: ${status.hasAccessToken ? '✅ Available' : '❌ Not available'}
- Refresh Token: ${status.hasRefreshToken ? '✅ Available' : '❌ Not available'}
- Credentials: ${status.hasCredentials ? '✅ Username/password configured' : '❌ Username/password not configured'}
- Refresh Status: ${status.refreshInProgress ? '🔄 Refresh in progress' : '⏸️ Idle'}

${status.hasCredentials && status.hasAccessToken ? 
  '✅ Automatic token refresh is enabled and working' : 
  '⚠️  Token refresh may not work properly - ensure MATRIX_USERNAME and MATRIX_PASSWORD are set'}`;

    await sendMessage(statusMessage);
  }

  /**
   * Handle !token refresh command - manually trigger token refresh
   */
  private async handleTokenRefreshCommand(sendMessage: MessageSender) {
    if (!this.tokenManager) {
      await sendMessage(
        `❌ Manual token refresh not available
- Current mode: Static token (ACCESS_TOKEN only)
- To enable refresh: Set MATRIX_USERNAME and MATRIX_PASSWORD environment variables and restart bot`
      );
      return;
    }

    const status = this.tokenManager.getTokenStatus();
    if (!status.hasCredentials) {
      await sendMessage(
        `❌ Cannot refresh token: Missing credentials
- MATRIX_USERNAME and MATRIX_PASSWORD environment variables are required for token refresh
- Current configuration only supports static ACCESS_TOKEN mode`
      );
      return;
    }

    if (status.refreshInProgress) {
      await sendMessage('⚠️ Token refresh already in progress, please wait...');
      return;
    }

    try {
      await sendMessage('🔄 Starting manual token refresh...');
      const result = await this.tokenManager.refreshToken();
      await sendMessage(
        `✅ Token refresh successful!
- New access token: Obtained
- Refresh token: ${result.refresh_token ? 'Updated' : 'Not provided by server'}
- Expires: ${result.expires_in_ms ? `${Math.round(result.expires_in_ms / 1000 / 60)} minutes` : 'Unknown'}
- Device ID: ${result.device_id || 'Not provided'}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await sendMessage(`❌ Token refresh failed: ${errorMessage}`);
    }
  }

  /**
   * Get accumulated LLM metrics from the current client
   */
  async getLLMMetrics() {
    const client = await this.getLLMClient();
    return client.getMetrics?.() || null;
  }

  /**
   * Reset LLM metrics for the current client
   */
  async resetLLMMetrics() {
    const client = await this.getLLMClient();
    client.resetMetrics?.();
  }
}
