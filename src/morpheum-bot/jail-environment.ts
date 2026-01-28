import { execa } from "execa";
import { JailClient } from "./jailClient";

export type JailEnvironmentOptions = {
  host: string;
  port: number;
  forceCreate?: boolean;
  allowCreate?: boolean;
  containerPrefix?: string;
  readinessAttempts?: number;
  readinessIntervalMs?: number;
  sendMessage?: (message: string) => Promise<void>;
};

export async function checkJailReadiness(
  host: string,
  port: number,
  attempts: number = 60,
  intervalMs: number = 1000,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const jailClient = new JailClient(host, port);
      const response = await jailClient.execute('echo "Ready"');
      if (response.includes("Ready")) {
        return true;
      }
    } catch (error) {
      // Ignore errors (like ECONNREFUSED) and retry
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return false;
}

export async function createJailEnvironment(
  containerName: string,
  port: number,
  sendMessage?: (message: string) => Promise<void>,
): Promise<void> {
  if (sendMessage) {
    await sendMessage("Creating a new environment...");
  }
  const { stdout, stderr } = await execa(
    "nix",
    ["develop", "-c", "./run.sh", containerName, String(port), String(port + 1)],
    { cwd: "./jail", stdio: "pipe" },
  );
  if (sendMessage) {
    await sendMessage(
      `Successfully created container: ${containerName}\nStdout:\n${stdout}\nStderr:\n${stderr}`,
    );
  }
}

export async function ensureJailEnvironment(
  options: JailEnvironmentOptions,
): Promise<{ client: JailClient; containerName?: string }> {
  const {
    host,
    port,
    forceCreate = false,
    allowCreate = true,
    containerPrefix = "gauntlet-test-",
    readinessAttempts = 60,
    readinessIntervalMs = 1000,
    sendMessage,
  } = options;

  if (!forceCreate) {
    const isReady = await checkJailReadiness(host, port, 1, 200);
    if (isReady) {
      return { client: new JailClient(host, port) };
    }
    if (!allowCreate) {
      throw new Error(`Jail environment not ready at ${host}:${port}`);
    }
  }

  const containerName = `${containerPrefix}${Date.now()}`;
  await createJailEnvironment(containerName, port, sendMessage);

  const isReady = await checkJailReadiness(
    host,
    port,
    readinessAttempts,
    readinessIntervalMs,
  );
  if (!isReady) {
    throw new Error("Container did not become ready in time.");
  }

  return { client: new JailClient(host, port), containerName };
}
