#!/usr/bin/env bun

import {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
  LogLevel,
  LogService,
} from "matrix-bot-sdk";
import { createMessageQueue } from "./message-queue";
import { MorpheumBot } from "./bot";
import { TokenManager } from "./token-manager";
import { normalizeDashes } from "./dash-normalizer";
import { loadBotConfigs, ResolvedBotConfig } from "./bot-config";
import * as path from "path";
import * as fs from "fs";

// Parse command line arguments
interface ParsedArgs {
  register?: string;
  help?: boolean;
  debug?: boolean;
}

function showHelp(): void {
  console.log("Morpheum Bot - Matrix AI Assistant");
  console.log("");
  console.log("USAGE:");
  console.log("  bun src/morpheum-bot/index.ts [OPTIONS]");
  console.log("");
  console.log("OPTIONS:");
  console.log("  --register <server-url>    Register a new user account on the specified Matrix server");
  console.log("  --debug                    Enable debug logging of all received commands");
  console.log("  --help, -h                 Show this help message and exit");
  console.log("");
  console.log("EXAMPLES:");
  console.log("  bun src/morpheum-bot/index.ts                                 # Start bot with existing credentials");
  console.log("  bun src/morpheum-bot/index.ts --register matrix.morpheum.dev  # Register new user and start bot");
  console.log("  bun src/morpheum-bot/index.ts --debug                         # Start bot with debug logging enabled");
  console.log("  bun src/morpheum-bot/index.ts --help                          # Show this help message");
  console.log("");
  console.log("ENVIRONMENT VARIABLES:");
  console.log("  MORPHEUM_BOTS_CONFIG       Path to JSON config for multi-identity bots");
  console.log("  HOMESERVER_URL             Matrix homeserver URL (required unless using --register)");
  console.log("  ACCESS_TOKEN               Matrix access token (required if no username/password)");
  console.log("  MATRIX_USERNAME            Matrix username for login/registration");
  console.log("  MATRIX_PASSWORD            Matrix password for login/registration");
  console.log("  REGISTRATION_TOKEN_*       Registration token for specific servers (when using --register)");
  console.log("");
  console.log("For more information, see: https://github.com/anicolao/morpheum");
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const normalizedArgs = args.map(normalizeDashes);
  const result: ParsedArgs = {};

  for (let i = 0; i < normalizedArgs.length; i++) {
    if (normalizedArgs[i] === '--help' || normalizedArgs[i] === '-h') {
      result.help = true;
    } else if (normalizedArgs[i] === '--debug') {
      result.debug = true;
    } else if (normalizedArgs[i] === '--register' && i + 1 < normalizedArgs.length) {
      result.register = normalizedArgs[i + 1];
      i++; // Skip next argument
    } else if (normalizedArgs[i] === '--register') {
      console.error("Error: --register requires a server URL argument");
      console.error("Usage: bun src/morpheum-bot/index.ts --register <server-url>");
      console.error("Example: bun src/morpheum-bot/index.ts --register matrix.morpheum.dev");
      process.exit(1);
    } else if (normalizedArgs[i]?.startsWith('-')) {
      console.error(`Unknown argument: ${args[i]}`);
      console.error("Usage: bun src/morpheum-bot/index.ts [--register <server-url>] [--debug] [--help]");
      console.error("Use --help for more information.");
      process.exit(1);
    }
  }

  return result;
}

const parsedArgs = parseArgs();

// Handle help flag
if (parsedArgs.help) {
  showHelp();
  process.exit(0);
}

// Functions for registration
function generateRegistrationTokenEnvVar(serverUrl: string): string {
  // Convert server URL to environment variable name
  // e.g., matrix.morpheum.dev -> REGISTRATION_TOKEN_MATRIX_MORPHEUM_DEV
  const cleanServerName = serverUrl
    .replace(/[^a-zA-Z0-9]/g, '_')  // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_')           // Replace multiple underscores with single
    .replace(/^_|_$/g, '')         // Remove leading/trailing underscores
    .toUpperCase();
  
  return `REGISTRATION_TOKEN_${cleanServerName}`;
}

async function registerUser(serverUrl: string, username: string, password: string): Promise<void> {
  const registrationTokenEnvVar = generateRegistrationTokenEnvVar(serverUrl);
  const registrationToken = process.env[registrationTokenEnvVar];
  
  if (!registrationToken) {
    console.error(`Error: Registration token not found in environment variable ${registrationTokenEnvVar}`);
    console.error(`Please set ${registrationTokenEnvVar} with your registration token`);
    process.exit(1);
  }

  console.log(`[Registration] Attempting to register user on ${serverUrl}`);
  console.log(`[Registration] Using registration token from ${registrationTokenEnvVar}`);

  try {
    // Import matrix-js-sdk for registration
    const sdk = await import('matrix-js-sdk');
    const client = sdk.createClient({
      baseUrl: `https://${serverUrl}`,
    });

    // Register the user with the registration token
    const authData = {
      type: 'm.login.registration_token',
      token: registrationToken,
    };

    await client.register(username, password, null, authData);
    console.log(`[Registration] Successfully registered user ${username} on ${serverUrl}`);
  } catch (error: any) {
    if (error.errcode === 'M_USER_IN_USE') {
      console.log(`[Registration] User ${username} already exists on ${serverUrl}, proceeding with login`);
      return; // User already exists, this is okay
    }
    
    console.error(`[Registration] Failed to register user: ${error.message}`);
    if (error.data?.error) {
      console.error(`[Registration] Server error: ${error.data.error}`);
    }
    process.exit(1);
  }
}

async function loadPromptText(promptPath?: string): Promise<string | undefined> {
  if (!promptPath) {
    return undefined;
  }
  const resolvedPath = path.isAbsolute(promptPath)
    ? promptPath
    : path.resolve(process.cwd(), promptPath);
  return fs.promises.readFile(resolvedPath, 'utf8');
}

type BotRuntime = {
  config: ResolvedBotConfig;
  bot: MorpheumBot;
  client: MatrixClient;
  userId: string;
  messageQueue: ReturnType<typeof createMessageQueue>;
  tokenManager?: TokenManager;
};

async function createBotRuntime(config: ResolvedBotConfig, debugMode: boolean): Promise<BotRuntime> {
  let currentToken = config.matrix.accessToken;
  let currentRefreshToken: string | undefined;
  let client!: MatrixClient;
  let bot!: MorpheumBot;
  let messageQueue!: ReturnType<typeof createMessageQueue>;

  if (!currentToken && !(config.matrix.username && config.matrix.password)) {
    throw new Error(`Bot ${config.id} requires accessToken or username/password credentials.`);
  }

  let tokenManager: TokenManager | undefined;

  if (config.matrix.username && config.matrix.password) {
    console.log(`[Auth][${config.id}] Using username/password authentication with automatic token refresh`);

    tokenManager = new TokenManager({
      homeserverUrl: config.matrix.homeserverUrl,
      username: config.matrix.username,
      password: config.matrix.password,
      accessToken: currentToken,
      onTokenRefresh: async (newToken: string, newRefreshToken?: string) => {
        console.log(`[Auth][${config.id}] Updating client with new access token`);
        currentToken = newToken;
        currentRefreshToken = newRefreshToken;
        await client.stop();
        messageQueue.stop();
        client = createMatrixClient(newToken, config.matrix.homeserverUrl, config.matrix.storagePath);
        bot.setMatrixClient(client);
        messageQueue = createMessageQueue(client);
        setupClientHandlers(client, bot, tokenManager, messageQueue.queueMessage);
        messageQueue.start();
        await client.start();
        console.log(`[Auth][${config.id}] Client reconnected with new token`);
      },
    });

    if (!currentToken) {
      console.log(`[Auth][${config.id}] No initial access token provided, obtaining one...`);
      try {
        const result = await tokenManager.getNewToken();
        currentToken = result.access_token;
        currentRefreshToken = result.refresh_token;
        console.log(`[Auth][${config.id}] Initial access token obtained successfully`);
        if (result.refresh_token) {
          console.log(`[Auth][${config.id}] Refresh token available for future use`);
        } else {
          console.log(`[Auth][${config.id}] No refresh token provided by server - will use password fallback`);
        }
      } catch (error) {
        console.error(`[Auth][${config.id}] Failed to obtain initial access token:`, error);
        throw error;
      }
    } else {
      console.log(`[Auth][${config.id}] Using provided access token with fallback refresh capability`);
    }

    if (currentRefreshToken) {
      tokenManager.setRefreshToken(currentRefreshToken);
    }
  } else if (currentToken) {
    console.log(`[Auth][${config.id}] Using ACCESS_TOKEN-only mode`);
    console.log(`[Auth][${config.id}] Note: Automatic token refresh requires MATRIX_USERNAME and MATRIX_PASSWORD`);
  }

  const promptText = await loadPromptText(config.prompt);
  bot = new MorpheumBot(tokenManager, debugMode, {
    id: config.id,
    displayName: config.displayName,
    systemPrompt: promptText,
    llmOverrides: config.llm,
  });

  client = createMatrixClient(currentToken!, config.matrix.homeserverUrl, config.matrix.storagePath);
  bot.setMatrixClient(client);

  messageQueue = createMessageQueue(client);
  setupClientHandlers(client, bot, tokenManager, messageQueue.queueMessage);
  messageQueue.start();
  await client.start();

  const userId = await client.getUserId();
  console.log(`[Startup] Bot ${config.id} online as ${userId}`);

  return {
    config,
    bot,
    client,
    userId,
    messageQueue,
    tokenManager,
  };
}

// Main execution function
async function main() {
  const defaultConfigPath = fs.existsSync('morpheum-bots.json') ? 'morpheum-bots.json' : undefined;
  const configPath = process.env.MORPHEUM_BOTS_CONFIG || defaultConfigPath;

  if (parsedArgs.register && configPath) {
    console.error("Error: --register is not supported when MORPHEUM_BOTS_CONFIG is set.");
    process.exit(1);
  }

  if (!configPath && !process.env.HOMESERVER_URL) {
    console.error("HOMESERVER_URL environment variable is required.");
    process.exit(1);
  }

  const configs = await loadBotConfigs(configPath);

  if (parsedArgs.register) {
    const primary = configs[0];
    if (!primary.matrix.username || !primary.matrix.password) {
      console.error("Error: --register requires MATRIX_USERNAME and MATRIX_PASSWORD environment variables");
      console.error("These will be used to register the new user account");
      process.exit(1);
    }

    const registrationServer = parsedArgs.register;
    const effectiveHomeserverUrl = `https://${registrationServer}`;

    await registerUser(registrationServer, primary.matrix.username, primary.matrix.password);
    console.log(`[Registration] Setting homeserver URL to ${effectiveHomeserverUrl} for login`);
    primary.matrix.homeserverUrl = effectiveHomeserverUrl;
  }

  LogService.setLevel(LogLevel.INFO);
  LogService.setLogger({
    info: (module, ...args) =>
      console.log(new Date().toISOString(), "[INFO]", module, ...args),
    warn: (module, ...args) =>
      console.warn(new Date().toISOString(), "[WARN]", module, ...args),
    error: (module, ...args) =>
      console.error(new Date().toISOString(), "[ERROR]", module, ...args),
    debug: (module, ...args) =>
      console.debug(new Date().toISOString(), "[DEBUG]", ...args),
    trace: (module, ...args) =>
      console.trace(new Date().toISOString(), "[TRACE]", ...args),
  });

  const runtimes = await Promise.all(configs.map((config) => createBotRuntime(config, parsedArgs.debug || false)));
  const registry = runtimes.map((runtime) => ({
    id: runtime.config.id,
    displayName: runtime.config.displayName,
    userId: runtime.userId,
  }));

  for (const runtime of runtimes) {
    runtime.bot.setAvailableBots(registry);
  }

  await syncBotRooms(runtimes);

  console.log(`Morpheum Bot started (${runtimes.length} identities).`);
}

async function syncBotRooms(runtimes: Array<Awaited<ReturnType<typeof createBotRuntime>>>) {
  const inviter = runtimes.find((runtime) => runtime.config.id === "morpheum") ?? runtimes[0];
  if (!inviter) {
    return;
  }

  let inviterRooms: string[] = [];
  try {
    inviterRooms = await inviter.client.getJoinedRooms();
  } catch (error) {
    console.warn(`[Rooms][${inviter.config.id}] Failed to list joined rooms:`, error);
    return;
  }

  const otherRuntimes = runtimes.filter((runtime) => runtime !== inviter);
  const otherRoomLists = await Promise.all(
    otherRuntimes.map(async (runtime) => {
      try {
        const rooms = await runtime.client.getJoinedRooms();
        return { runtime, rooms };
      } catch (error) {
        console.warn(`[Rooms][${runtime.config.id}] Failed to list joined rooms:`, error);
        return { runtime, rooms: [] as string[] };
      }
    }),
  );

  await Promise.all(
    otherRoomLists.map(async (entry) => {
      const joined = new Set(entry.rooms);
      const joinTargets = inviterRooms.filter((roomId) => !joined.has(roomId));
      for (const roomId of joinTargets) {
        try {
          await inviter.client.inviteUser(entry.runtime.userId, roomId);
          console.log(`[Rooms][${inviter.config.id}] Invited ${entry.runtime.userId} to ${roomId}`);
        } catch (error) {
          console.warn(`[Rooms][${inviter.config.id}] Failed to invite ${entry.runtime.userId} to ${roomId}:`, error);
        }

        try {
          await entry.runtime.client.joinRoom(roomId);
          console.log(`[Rooms][${entry.runtime.config.id}] Joined ${roomId}`);
        } catch (error) {
          console.warn(`[Rooms][${entry.runtime.config.id}] Failed to join ${roomId}:`, error);
        }
      }
    }),
  );
}

function createMatrixClient(token: string, homeserverUrl: string, storagePath: string): MatrixClient {
  const storage = new SimpleFsStorageProvider(storagePath);
  const matrixClient = new MatrixClient(homeserverUrl, token, storage);
  AutojoinRoomsMixin.setupOnClient(matrixClient);
  return matrixClient;
}

function setupClientHandlers(
  matrixClient: MatrixClient,
  bot: MorpheumBot,
  tokenManager: TokenManager | undefined,
  queueMessage: (roomId: string, content: any) => void,
) {
  matrixClient.on("room.message", async (roomId, event) => {
    const wrappedHandler = async () => {
      const userId = await matrixClient.getUserId();
      if (event.sender === userId) return;
      const body = event.content?.body;
      if (!body) return;

      const sendMessage = async (message: string, html?: string) => {
        if (html) {
          queueMessage(roomId, {
            msgtype: "m.text",
            body: message,
            format: "org.matrix.custom.html",
            formatted_body: html,
          });
        } else {
          queueMessage(roomId, {
            msgtype: "m.text",
            body: message,
          });
        }
      };

      try {
        const members = await matrixClient.getJoinedRoomMembersWithProfiles(roomId);
        const self = members[userId];
        const displayName = self?.display_name;
        const localpart = userId.split(':')[0].substring(1); // from @user:server.com -> user

        const mentionNames = [displayName, localpart, userId].filter(Boolean).map(n => n!.toLowerCase());
        const lowerBody = body.toLowerCase();

        for (const name of mentionNames) {
          if (
            lowerBody === name ||
            lowerBody.startsWith(name + ' ') ||
            lowerBody.startsWith(name + ':') ||
            lowerBody.startsWith(name + ',') ||
            lowerBody.startsWith(name + '\t') ||
            lowerBody.startsWith(name + '\n')
          ) {
            let task = body.substring(name.length).trim();
            if (task.startsWith(':') || task.startsWith(',')) {
              task = task.substring(1).trim();
            }

            if (task) {
              await bot.processMessage(task, event.sender, sendMessage, roomId);
              return;
            } else if (lowerBody === name) {
              await bot.processMessage('!help', event.sender, sendMessage, roomId);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Error handling mention:", e);
      }

      if (body.startsWith("!")) {
        await bot.processMessage(body, event.sender, sendMessage, roomId);
      }
    };

    if (tokenManager) {
      const wrappedWithRefresh = tokenManager.withTokenRefresh(wrappedHandler);
      try {
        await wrappedWithRefresh();
      } catch (error) {
        console.error("Error in room message handler (after token refresh attempt):", error);
      }
    } else {
      try {
        await wrappedHandler();
      } catch (error) {
        console.error("Error in room message handler:", error);
      }
    }
  });
}

// Start the bot
main().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
