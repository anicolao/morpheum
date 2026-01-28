import * as fs from 'fs';

export type LlmOverrides = {
  provider?: 'openai' | 'ollama' | 'copilot' | 'gemini';
  model?: string;
  baseUrl?: string;
};

export type MatrixConfig = {
  homeserverUrl?: string;
  accessToken?: string;
  username?: string;
  password?: string;
  storagePath?: string;
};

export type BotPersonaConfig = {
  id: string;
  displayName?: string;
  prompt?: string;
  llm?: LlmOverrides;
  matrix: MatrixConfig;
};

export type BotConfigDefaults = {
  prompt?: string;
  llm?: LlmOverrides;
  matrix?: MatrixConfig & { storagePathPrefix?: string };
};

export type BotConfigFile = {
  defaults?: BotConfigDefaults;
  bots: BotPersonaConfig[];
};

export type ResolvedBotConfig = {
  id: string;
  displayName?: string;
  prompt?: string;
  llm?: LlmOverrides;
  matrix: {
    homeserverUrl: string;
    accessToken?: string;
    username?: string;
    password?: string;
    storagePath: string;
  };
};

function expandEnvVar(value: string): string {
  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      throw new Error(`Missing environment variable: ${varName}`);
    }
    return envValue;
  });
}

function expandEnvInObject<T>(value: T): T {
  if (typeof value === 'string') {
    return expandEnvVar(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(item => expandEnvInObject(item)) as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = expandEnvInObject(entry);
    }
    return result as T;
  }
  return value;
}

function buildStoragePath(botId: string, defaults?: BotConfigDefaults): string {
  const prefix = defaults?.matrix?.storagePathPrefix;
  if (prefix) {
    return `${prefix}.${botId}.json`;
  }
  return `bot.${botId}.json`;
}

export async function loadBotConfigs(configPath?: string): Promise<ResolvedBotConfig[]> {
  if (!configPath) {
    const homeserverUrl = process.env.HOMESERVER_URL || '';
    return [
      {
        id: 'default',
        displayName: process.env.MORPHEUM_BOT_DISPLAY_NAME,
        matrix: {
          homeserverUrl,
          accessToken: process.env.ACCESS_TOKEN,
          username: process.env.MATRIX_USERNAME,
          password: process.env.MATRIX_PASSWORD,
          storagePath: 'bot.json',
        },
      },
    ];
  }

  const raw = await fs.promises.readFile(configPath, 'utf8');
  const parsed = JSON.parse(raw) as BotConfigFile;
  const expanded = expandEnvInObject(parsed);
  const defaults = expanded.defaults || {};

  if (!expanded.bots || expanded.bots.length === 0) {
    throw new Error('Bot configuration must include at least one bot entry.');
  }

  return expanded.bots.map((bot) => {
    const prompt = bot.prompt || defaults.prompt;
    const llm = { ...defaults.llm, ...bot.llm };
    const matrixDefaults = defaults.matrix || {};
    const matrix = { ...matrixDefaults, ...bot.matrix } as MatrixConfig & {
      storagePathPrefix?: string;
    };

    const homeserverUrl = matrix.homeserverUrl || process.env.HOMESERVER_URL || '';
    if (!homeserverUrl) {
      throw new Error(`Missing homeserverUrl for bot ${bot.id}`);
    }

    const storagePath = matrix.storagePath || buildStoragePath(bot.id, defaults);

    return {
      id: bot.id,
      displayName: bot.displayName,
      prompt,
      llm,
      matrix: {
        homeserverUrl,
        accessToken: matrix.accessToken,
        username: matrix.username,
        password: matrix.password,
        storagePath,
      },
    };
  });
}
