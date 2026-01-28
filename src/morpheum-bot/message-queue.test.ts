import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMessageQueue } from './message-queue';
import * as matrixSdk from 'matrix-bot-sdk';
import type { MatrixClient } from 'matrix-bot-sdk';

describe('message-queue', () => {
  let client: MatrixClient;

  beforeEach(() => {
    client = new (matrixSdk as any).MatrixClient('http://localhost', 'token');
    vi.spyOn(client, 'sendMessage').mockResolvedValue('');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should send a message from the queue', async () => {
    const queue = createMessageQueue(client, 200);
    queue.start();

    queue.queueMessage('room1', { msgtype: 'm.text', body: 'Hello' });

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(client.sendMessage).toHaveBeenCalledWith('room1', { msgtype: 'm.text', body: 'Hello' });
    queue.stop();
  });

  it('should handle rate-limiting and retry', async () => {
    const error = new (matrixSdk as any).MatrixError({ errcode: 'M_LIMIT_EXCEEDED', error: 'Too Many Requests', retry_after_ms: 100 });
    vi.spyOn(client, 'sendMessage')
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);

    const queue = createMessageQueue(client, 200);
    queue.start();

    queue.queueMessage('room1', { msgtype: 'm.text', body: 'Hello' });

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(client.sendMessage).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(client.sendMessage).toHaveBeenCalledTimes(2);
    queue.stop();
  });

  it('should batch multiple text messages into a single request', async () => {
    const queue = createMessageQueue(client, 200);
    queue.start();

    queue.queueMessage('room1', { msgtype: 'm.text', body: 'Hello' });
    queue.queueMessage('room1', { msgtype: 'm.text', body: 'World' });

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    expect(client.sendMessage).toHaveBeenCalledWith('room1', {
      msgtype: 'm.text',
      body: 'HelloWorld',
    });
    queue.stop();
  });

  it('should not batch html messages', async () => {
    const queue = createMessageQueue(client, 200);
    queue.start();

    queue.queueMessage('room1', { msgtype: 'm.text', body: 'Hello' });
    queue.queueMessage('room1', { msgtype: 'm.text', body: 'World', format: 'org.matrix.custom.html', formatted_body: '<p>World</p>' });

    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(client.sendMessage).toHaveBeenCalledTimes(2);
    expect(client.sendMessage).toHaveBeenCalledWith('room1', {
      msgtype: 'm.text',
      body: 'Hello',
    });
    expect(client.sendMessage).toHaveBeenCalledWith('room1', {
      msgtype: 'm.text',
      body: 'World',
      format: 'org.matrix.custom.html',
      formatted_body: '<p>World</p>',
    });
    queue.stop();
  });
});
