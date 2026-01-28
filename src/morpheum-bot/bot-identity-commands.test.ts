import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as llmClientModule from './llmClient';

vi.mock('crypto', () => ({
  randomUUID: () => 'test-uuid',
}));

import { MorpheumBot } from './bot';

const makeSendMessage = () => vi.fn().mockResolvedValue(undefined);

describe('MorpheumBot identity commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OLLAMA_API_URL = 'http://test-ollama:11434';
    process.env.OLLAMA_MODEL = 'test-model';

    vi.spyOn(fs.promises, 'readFile').mockResolvedValue('# Test Content');
    vi.spyOn(fs.promises, 'readdir').mockResolvedValue([]);
    vi.spyOn(llmClientModule, 'createLLMClient').mockResolvedValue({
      send: vi.fn().mockResolvedValue('response'),
      sendStreaming: vi.fn().mockResolvedValue("<next_step>Job's done!</next_step>"),
      getMetrics: vi.fn().mockReturnValue(null),
      resetMetrics: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('responds to !bot list with available identities', async () => {
    const bot = new MorpheumBot(undefined, false, { id: 'primary', displayName: 'Morpheum' });
    bot.setAvailableBots([
      { id: 'primary', displayName: 'Morpheum', userId: '@morpheum:example.com' },
      { id: 'reviewer', displayName: 'Reviewer', userId: '@reviewer:example.com' },
    ]);

    const sendMessage = makeSendMessage();
    await bot.processMessage('!bot list', 'tester', sendMessage, 'room');

    expect(sendMessage).toHaveBeenCalled();
    const message = sendMessage.mock.calls[0]?.[0] as string;
    expect(message).toContain('Available bots:');
    expect(message).toContain('primary');
    expect(message).toContain('reviewer');
  });

  it('responds to !bot whoami with identity label', async () => {
    const bot = new MorpheumBot(undefined, false, { id: 'primary', displayName: 'Morpheum' });
    const sendMessage = makeSendMessage();

    await bot.processMessage('!bot whoami', 'tester', sendMessage, 'room');

    expect(sendMessage).toHaveBeenCalledWith('Current bot identity: primary (Morpheum)');
  });

  it('formats !bot request messages with a task id', async () => {
    const bot = new MorpheumBot(undefined, false, { id: 'primary', displayName: 'Morpheum' });
    bot.setAvailableBots([
      { id: 'reviewer', displayName: 'Reviewer', userId: '@reviewer:example.com' },
    ]);

    const sendMessage = makeSendMessage();
    await bot.processMessage('!bot request reviewer check this', 'tester', sendMessage, 'room');

    expect(sendMessage).toHaveBeenCalledWith(
      '@reviewer:example.com Request: check this (from Morpheum, id: test-uuid)'
    );
  });
});
