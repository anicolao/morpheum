import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export type OAuthProvider = 'gemini' | 'openai';

export interface OAuthTokenRecord {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes?: string[];
}

export interface OAuthStoreData {
  version: number;
  providers: Record<OAuthProvider, OAuthTokenRecord | undefined>;
}

const DEFAULT_STORE: OAuthStoreData = {
  version: 1,
  providers: {},
};

export function getOAuthStorePath(): string {
  return path.join(os.homedir(), '.config', 'morpheum', 'oauth.json');
}

async function ensureStoreDir(): Promise<void> {
  const storePath = getOAuthStorePath();
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
}

export async function readOAuthStore(): Promise<OAuthStoreData> {
  const storePath = getOAuthStorePath();
  try {
    const raw = await fs.readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw) as OAuthStoreData;
    if (!parsed.version || !parsed.providers) {
      return { ...DEFAULT_STORE };
    }
    return parsed;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return { ...DEFAULT_STORE };
    }
    throw error;
  }
}

export async function writeOAuthStore(data: OAuthStoreData): Promise<void> {
  await ensureStoreDir();
  const storePath = getOAuthStorePath();
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(storePath, serialized, 'utf8');
}

export async function getProviderTokens(provider: OAuthProvider): Promise<OAuthTokenRecord | undefined> {
  const store = await readOAuthStore();
  return store.providers[provider];
}

export async function setProviderTokens(provider: OAuthProvider, record?: OAuthTokenRecord): Promise<void> {
  const store = await readOAuthStore();
  if (record) {
    store.providers[provider] = record;
  } else {
    delete store.providers[provider];
  }
  await writeOAuthStore(store);
}
