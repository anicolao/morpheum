import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadBotConfigs } from './bot-config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('bot-config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads single-bot config from environment when no path is provided', async () => {
    process.env.HOMESERVER_URL = 'https://matrix.example.com';
    process.env.ACCESS_TOKEN = 'test-token';
    process.env.MATRIX_USERNAME = 'tester';
    process.env.MATRIX_PASSWORD = 'secret';

    const configs = await loadBotConfigs();
    expect(configs).toHaveLength(1);
    expect(configs[0]?.matrix.homeserverUrl).toBe('https://matrix.example.com');
    expect(configs[0]?.matrix.accessToken).toBe('test-token');
    expect(configs[0]?.matrix.storagePath).toBe('bot.json');
  });

  it('expands environment variables in config files and applies defaults', async () => {
    process.env.TEST_ACCESS_TOKEN = 'env-token';
    process.env.TEST_SERVER = 'https://matrix.test';

    const tempFile = path.join(os.tmpdir(), 'morpheum-bot-config.json');
    const config = {
      defaults: {
        prompt: 'prompts/swe-agent.md',
        llm: { provider: 'ollama', model: 'morpheum-local' },
        matrix: { homeserverUrl: '${TEST_SERVER}', storagePathPrefix: 'bot' },
      },
      bots: [
        {
          id: 'reviewer',
          displayName: 'Reviewer',
          matrix: { accessToken: '${TEST_ACCESS_TOKEN}' },
        },
      ],
    };

    await fs.promises.writeFile(tempFile, JSON.stringify(config), 'utf8');
    const configs = await loadBotConfigs(tempFile);

    expect(configs).toHaveLength(1);
    expect(configs[0]?.matrix.homeserverUrl).toBe('https://matrix.test');
    expect(configs[0]?.matrix.accessToken).toBe('env-token');
    expect(configs[0]?.matrix.storagePath).toBe('bot.reviewer.json');
    expect(configs[0]?.prompt).toBe('prompts/swe-agent.md');
    expect(configs[0]?.llm?.provider).toBe('ollama');

    await fs.promises.unlink(tempFile);
  });
});
