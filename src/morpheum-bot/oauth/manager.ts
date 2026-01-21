import http from 'http';
import { randomBytes, createHash } from 'crypto';
import { getProviderTokens, setProviderTokens, type OAuthProvider, type OAuthTokenRecord } from './store';

export interface OAuthClientConfig {
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  authEndpoint: string;
  tokenEndpoint: string;
}

export class OAuthManager {
  constructor(private readonly provider: OAuthProvider, private readonly config: OAuthClientConfig) {}

  async createLoopbackAuthorization(): Promise<{ authorizationUrl: string; redirectUri: string; waitForToken: Promise<OAuthTokenRecord> }> {
    const state = this.randomString(16);
    const codeVerifier = this.randomString(64);
    const codeChallenge = this.base64UrlEncode(createHash('sha256').update(codeVerifier).digest());

    const server = http.createServer();
    let redirectUri = '';

    const waitForToken = new Promise<OAuthTokenRecord>((resolve, reject) => {
      server.on('request', async (req, res) => {
        try {
        const url = new URL(req.url || '/', 'http://127.0.0.1');
          if (url.pathname !== '/oauth2callback') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
          }

          const code = url.searchParams.get('code');
          const returnedState = url.searchParams.get('state');
          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing authorization code');
            return;
          }
          if (!returnedState || returnedState !== state) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('State mismatch');
            return;
          }

          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Authorization complete. You can return to the chat.');

          server.close();

          const record = await this.exchangeCodeForToken(code, codeVerifier, redirectUri);
          await setProviderTokens(this.provider, record);
          resolve(record);
        } catch (error) {
          server.close();
          reject(error);
        }
      });
    });

    redirectUri = await new Promise<string>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (typeof address === 'object' && address?.port) {
          resolve(`http://127.0.0.1:${address.port}/oauth2callback`);
        } else {
          reject(new Error('Failed to determine loopback port'));
        }
      });
      server.on('error', reject);
    });

    const authUrl = new URL(this.config.authEndpoint);
    authUrl.searchParams.set('client_id', this.config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.config.scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return { authorizationUrl: authUrl.toString(), redirectUri, waitForToken };
  }

  async getAccessToken(): Promise<string> {
    const record = await getProviderTokens(this.provider);
    if (!record) {
      throw new Error('OAuth tokens not configured. Run the OAuth flow first.');
    }

    const now = Date.now();
    if (record.accessToken && record.expiresAt && record.expiresAt - now > 60000) {
      return record.accessToken;
    }

    if (!record.refreshToken) {
      throw new Error('OAuth refresh token is missing. Re-run the OAuth flow.');
    }

    const refreshed = await this.refreshToken(record.refreshToken);
    await setProviderTokens(this.provider, refreshed);
    if (!refreshed.accessToken) {
      throw new Error('OAuth refresh did not return an access token');
    }
    return refreshed.accessToken;
  }

  async getStatus(): Promise<{ hasRefreshToken: boolean; hasAccessToken: boolean; expiresAt?: number }> {
    const record = await getProviderTokens(this.provider);
    return {
      hasRefreshToken: Boolean(record?.refreshToken),
      hasAccessToken: Boolean(record?.accessToken),
      expiresAt: record?.expiresAt,
    };
  }

  async revokeTokens(): Promise<void> {
    await setProviderTokens(this.provider, undefined);
  }

  private async exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string): Promise<OAuthTokenRecord> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    if (this.config.clientSecret) {
      body.set('client_secret', this.config.clientSecret);
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return this.normalizeTokenResponse(data);
  }

  private async refreshToken(refreshToken: string): Promise<OAuthTokenRecord> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    if (this.config.clientSecret) {
      body.set('client_secret', this.config.clientSecret);
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth refresh failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const normalized = this.normalizeTokenResponse(data);
    normalized.refreshToken = normalized.refreshToken || refreshToken;
    return normalized;
  }

  private normalizeTokenResponse(data: any): OAuthTokenRecord {
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : undefined;
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scopes: typeof data.scope === 'string' ? data.scope.split(' ') : undefined,
    };
  }

  private randomString(bytes: number): string {
    return this.base64UrlEncode(randomBytes(bytes));
  }

  private base64UrlEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
