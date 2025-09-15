#!/usr/bin/env bun

import {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
  LogLevel,
  LogService,
} from "matrix-bot-sdk";
import { startMessageQueue, queueMessage } from "./message-queue";
import { MorpheumBot } from "./bot";
import { TokenManager } from "./token-manager";
import { normalizeDashes } from "./dash-normalizer";

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
  console.log("  HOMESERVER_URL              Matrix homeserver URL (required unless using --register)");
  console.log("  ACCESS_TOKEN                Matrix access token (required if no username/password)");
  console.log("  MATRIX_USERNAME             Matrix username for login/registration");
  console.log("  MATRIX_PASSWORD             Matrix password for login/registration");
  console.log("  REGISTRATION_TOKEN_*        Registration token for specific servers (when using --register)");
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

// read environment variables
const homeserverUrl = process.env.HOMESERVER_URL;
const accessToken = process.env.ACCESS_TOKEN;
const username = process.env.MATRIX_USERNAME;
const password = process.env.MATRIX_PASSWORD;

// Determine effective homeserver URL
let effectiveHomeserverUrl: string;

// Main execution function
async function main() {
  let bot: any;
  let tokenManager: TokenManager | undefined;
  let client: MatrixClient;
  
  // Handle registration if --register flag is provided
  if (parsedArgs.register) {
    if (!username || !password) {
      console.error("Error: --register requires MATRIX_USERNAME and MATRIX_PASSWORD environment variables");
      console.error("These will be used to register the new user account");
      process.exit(1);
    }
    
    // Override homeserver URL if registering on a different server
    const registrationServer = parsedArgs.register;
    effectiveHomeserverUrl = `https://${registrationServer}`;
    
    // Register the user first
    await registerUser(registrationServer, username, password);
    
    // Update homeserver URL for subsequent operations
    console.log(`[Registration] Setting homeserver URL to ${effectiveHomeserverUrl} for login`);
    process.env.HOMESERVER_URL = effectiveHomeserverUrl;
  } else {
    if (!homeserverUrl) {
      console.error("HOMESERVER_URL environment variable is required.");
      process.exit(1);
    }
    effectiveHomeserverUrl = homeserverUrl;
  }

// Require either ACCESS_TOKEN or both MATRIX_USERNAME and MATRIX_PASSWORD
if (!accessToken && (!username || !password)) {
  console.error(
    "Either ACCESS_TOKEN or both MATRIX_USERNAME and MATRIX_PASSWORD environment variables are required.",
  );
  process.exit(1);
}

let currentToken = accessToken;
let currentRefreshToken: string | undefined;

// Setup token manager based on available credentials
if (username && password) {
  console.log("[Auth] Using username/password authentication with automatic token refresh");
  
  // If no initial token, get one now
  if (!currentToken) {
    console.log("[Auth] No initial access token provided, obtaining one...");
    tokenManager = new TokenManager({
      homeserverUrl: effectiveHomeserverUrl,
      username,
      password,
    });
    try {
      const result = await tokenManager.getNewToken();
      currentToken = result.access_token;
      currentRefreshToken = result.refresh_token;
      console.log("[Auth] Initial access token obtained successfully");
      if (result.refresh_token) {
        console.log("[Auth] Refresh token available for future use");
      } else {
        console.log("[Auth] No refresh token provided by server - will use password fallback");
      }
    } catch (error) {
      console.error("[Auth] Failed to obtain initial access token:", error);
      process.exit(1);
    }
  } else {
    console.log("[Auth] Using provided access token with fallback refresh capability");
  }
  
  // Setup token refresh callback
  tokenManager = new TokenManager({
    homeserverUrl: effectiveHomeserverUrl,
    username,
    password,
    accessToken: currentToken,
    onTokenRefresh: async (newToken: string, newRefreshToken?: string) => {
      console.log("[Auth] Updating client with new access token");
      currentToken = newToken;
      currentRefreshToken = newRefreshToken;
      // Stop the old client
      await client.stop();
      // Create new client with new token
      client = createMatrixClient(newToken, effectiveHomeserverUrl);
      // Update the Matrix client on the bot
      bot.setMatrixClient(client);
      setupClientHandlers(client, bot, tokenManager);
      // Restart the client
      await client.start();
      console.log("[Auth] Client reconnected with new token");
    }
  });
  
  // Set initial refresh token if we have one
  if (currentRefreshToken) {
    tokenManager.setRefreshToken(currentRefreshToken);
  }
} else if (accessToken) {
  console.log("[Auth] Using ACCESS_TOKEN-only mode");
  console.log("[Auth] Note: Automatic token refresh requires MATRIX_USERNAME and MATRIX_PASSWORD");
  console.log("[Auth] To enable refresh tokens, set MATRIX_USERNAME and MATRIX_PASSWORD environment variables");
  console.log("[Auth] Bot will continue with static token but may stop working when token expires");
} else {
  console.log("[Auth] Using static ACCESS_TOKEN (no automatic refresh)");
}

// Create bot instance with tokenManager if available
bot = new MorpheumBot(tokenManager, parsedArgs.debug);

// Create initial client
client = createMatrixClient(currentToken!, effectiveHomeserverUrl);

// Set the Matrix client on the bot for project room functionality
bot.setMatrixClient(client);

// Before we start the client, let's set up a few things.

// First, let's prepare the logger. We'll be using the simple console logger.
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

// Setup handlers for initial client
setupClientHandlers(client, bot, tokenManager);

// And now we can start the client.
startMessageQueue(client);
await client.start();
console.log("Morpheum Bot started!");
}

function createMatrixClient(token: string, homeserverUrl: string): MatrixClient {
  // We'll want to make sure the bot doesn't have to do an initial sync every
  // time it restarts, so we need to prepare a storage provider. Here we use
  // a simple file storage provider.
  const storage = new SimpleFsStorageProvider("bot.json");
  
  // Now we can create the client.
  const matrixClient = new MatrixClient(homeserverUrl, token, storage);
  
  // Setup the autojoin mixin
  AutojoinRoomsMixin.setupOnClient(matrixClient);
  
  return matrixClient;
}

function setupClientHandlers(matrixClient: MatrixClient, bot: any, tokenManager?: TokenManager) {
  // Set up a command handler with token refresh capability
  matrixClient.on("room.message", async (roomId, event) => {
    const wrappedHandler = async () => {
      const userId = await matrixClient.getUserId();
      if (event.sender === userId) return;
      const body = event.content?.body;
      if (!body) return;

      const sendMessage = async (message: string, html?: string) => {
        if (html) {
          await queueMessage(roomId, {
            msgtype: "m.text",
            body: message,
            format: "org.matrix.custom.html",
            formatted_body: html,
          });
        } else {
          await queueMessage(roomId, {
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
          // Check for exact name match followed by a delimiter or end of string
          if (lowerBody === name || 
              lowerBody.startsWith(name + ' ') ||
              lowerBody.startsWith(name + ':') ||
              lowerBody.startsWith(name + ',') ||
              lowerBody.startsWith(name + '\t') ||
              lowerBody.startsWith(name + '\n')) {
            let task = body.substring(name.length).trim();
            if (task.startsWith(':') || task.startsWith(',')) {
              task = task.substring(1).trim();
            }
            
            if (task) {
              await bot.processMessage(task, event.sender, sendMessage, roomId);
              return;
            } else if (lowerBody === name) {
              // Handle case where bot is mentioned without a task
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

    // Wrap the handler with token refresh if available
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
