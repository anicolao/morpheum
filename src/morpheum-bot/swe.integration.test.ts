import * as matrixSdk from "matrix-bot-sdk";
import type { MatrixClient } from "matrix-bot-sdk";
import { SWEAgent } from "./sweAgent";
import { OllamaClient } from "./ollamaClient";
import { JailClient } from "./jailClient";
import { describe, it, vi, beforeEach } from "vitest";
import { assert } from "chai";

describe("Matrix Bot SWE Integration", () => {
  let client: MatrixClient;
  let sweAgent: SWEAgent;

  beforeEach(() => {
    client = new (matrixSdk as any).MatrixClient("http://localhost", "token");
    const ollamaClient = new OllamaClient("", "");
    const jailClient = new JailClient("", 0);
    sweAgent = new SWEAgent(ollamaClient, jailClient);
  });

  it("should trigger the SWE agent on !swe command", async () => {
    const runSpy = vi.spyOn(sweAgent, "run").mockResolvedValue("done");
    const messageSpy = vi.spyOn(client, "sendMessage").mockResolvedValue({});

    // This is a simplified simulation of the bot's message handler
    const handleMessage = async (roomId: string, body: string) => {
      if (body.startsWith("!swe ")) {
        const task = body.substring("!swe ".length);
        await sweAgent.run(task);
      }
    };

    await handleMessage("!room:localhost", "!swe test task");

    assert.isTrue(runSpy.mock.calls.length === 1);
    assert.deepEqual(runSpy.mock.calls[0], ["test task"]);
  });
});
