import type { MatrixClient } from "matrix-bot-sdk";
import * as matrixSdk from "matrix-bot-sdk";

export type MessageQueueEntry = { roomId: string; content: any };

export interface MessageQueueHandle {
  queueMessage: (roomId: string, content: any) => void;
  start: () => void;
  stop: () => void;
  getQueue: () => MessageQueueEntry[];
  clear: () => void;
}

export function createMessageQueue(client: MatrixClient, intervalMs: number = 1000): MessageQueueHandle {
  const messageQueue: MessageQueueEntry[] = [];
  let isSending = false;
  let intervalId: NodeJS.Timeout | null = null;

  async function processMessageQueue() {
    if (isSending || messageQueue.length === 0) {
      return;
    }

    isSending = true;

    const message = messageQueue[0];
    if (message.content.format === 'org.matrix.custom.html') {
      const messageToSend = messageQueue.shift()!;
      try {
        await client.sendMessage(messageToSend.roomId, messageToSend.content);
      } catch (e) {
      if (e instanceof (matrixSdk as any).MatrixError && e.errcode === "M_LIMIT_EXCEEDED") {
          console.warn(
            `Rate limited. Re-queueing message and waiting ${e.retryAfterMs}ms...`,
          );
          messageQueue.unshift(messageToSend);
          await new Promise((resolve) => setTimeout(resolve, e.retryAfterMs || 1000));
        } else {
          console.error("Failed to send message:", e);
        }
      }
    } else {
      let body = '';
      let lastRoomId = '';
      const messagesToSend: MessageQueueEntry[] = [];
      while (messageQueue.length > 0 && messageQueue[0].content.msgtype === 'm.text' && !messageQueue[0].content.format) {
        const currentMessage = messageQueue.shift()!;
        if (lastRoomId && currentMessage.roomId !== lastRoomId) {
          messageQueue.unshift(currentMessage);
          break;
        }
        messagesToSend.push(currentMessage);
        body += currentMessage.content.body;
        lastRoomId = currentMessage.roomId;
      }

      try {
        await client.sendMessage(lastRoomId, {
          msgtype: 'm.text',
          body,
        });
      } catch (e) {
      if (e instanceof (matrixSdk as any).MatrixError && e.errcode === "M_LIMIT_EXCEEDED") {
          console.warn(
            `Rate limited. Re-queueing message and waiting ${e.retryAfterMs}ms...`,
          );
          messageQueue.unshift(...messagesToSend);
          await new Promise((resolve) => setTimeout(resolve, e.retryAfterMs || 1000));
        } else {
          console.error("Failed to send message:", e);
        }
      }
    }

    isSending = false;
  }

  return {
    queueMessage: (roomId, content) => {
      messageQueue.push({ roomId, content });
    },
    start: () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      intervalId = setInterval(() => processMessageQueue(), intervalMs);
    },
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    getQueue: () => messageQueue,
    clear: () => {
      messageQueue.length = 0;
    },
  };
}
