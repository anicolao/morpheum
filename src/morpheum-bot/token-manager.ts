import * as sdk from 'matrix-js-sdk';

export interface TokenManagerConfig {
  homeserverUrl: string;
  username?: string;
  password?: string;
  accessToken?: string;
  onTokenRefresh?: (newToken: string, refreshToken?: string) => Promise<void>;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in_ms?: number;
  device_id?: string;
}

export class TokenManager {
  private homeserverUrl: string;
  private username?: string;
  private password?: string;
  private accessToken?: string;
  private onTokenRefresh?: (newToken: string, refreshToken?: string) => Promise<void>;
  private refreshInProgress = false;
  private currentRefreshToken?: string;

  constructor(config: TokenManagerConfig) {
    this.homeserverUrl = config.homeserverUrl;
    this.username = config.username;
    this.password = config.password;
    this.accessToken = config.accessToken;
    this.onTokenRefresh = config.onTokenRefresh;
  }

  /**
   * Set the current refresh token for use in token refresh
   */
  setRefreshToken(refreshToken?: string): void {
    this.currentRefreshToken = refreshToken || undefined;
  }

  /**
   * Attempt to obtain a refresh token using the current access token
   * Note: This may not be supported by all Matrix servers as there's no 
   * standard Matrix API endpoint to convert an access token to a refresh token.
   * This method attempts a few approaches that might work on some servers.
   */
  async tryGetRefreshTokenFromAccessToken(): Promise<string | undefined> {
    if (!this.accessToken) {
      console.log('[TokenManager] No access token available for refresh token request');
      return undefined;
    }

    console.log('[TokenManager] Attempting to obtain refresh token from existing access token...');
    console.log('[TokenManager] Note: This is experimental as Matrix spec does not define this operation');
    
    // Unfortunately, the Matrix Client-Server API does not provide a standard way
    // to obtain a refresh token from an existing access token. Refresh tokens are
    // typically only available during the initial login process.
    
    console.log('[TokenManager] Matrix specification does not support converting access tokens to refresh tokens');
    console.log('[TokenManager] To get refresh tokens, you need to authenticate with username/password initially');
    console.log('[TokenManager] Consider adding MATRIX_USERNAME and MATRIX_PASSWORD environment variables for refresh token support');
    
    return undefined;
  }

  /**
   * Get a new access token using refresh token if available, otherwise username/password
   */
  async getNewToken(): Promise<LoginResponse> {
    const client = sdk.createClient({
      baseUrl: this.homeserverUrl,
    });

    try {
      // Try refresh token first if available
      if (this.currentRefreshToken) {
        console.log('[TokenManager] Attempting token refresh using refresh token');
        try {
          const refreshResult = await client.refreshToken(this.currentRefreshToken);
          console.log('[TokenManager] Successfully refreshed token using refresh token');
          return {
            access_token: refreshResult.access_token,
            refresh_token: refreshResult.refresh_token,
            expires_in_ms: refreshResult.expires_in_ms
          };
        } catch (refreshError: any) {
          console.log('[TokenManager] Refresh token failed, trying fallback:', refreshError.message);
          this.currentRefreshToken = undefined; // Clear invalid refresh token
        }
      }

      // Fall back to username/password authentication if available
      if (this.username && this.password) {
        console.log('[TokenManager] Using username/password authentication');
        
        // Try different username formats as Matrix servers can be picky
        const usernameFormats = [
          this.username, // As provided
        ];
        
        // Add @ prefix if not present
        if (!this.username.startsWith('@')) {
          usernameFormats.push(`@${this.username}`);
        }
        
        // Add domain suffix if not present and we can extract domain from homeserver URL
        if (!this.username.includes(':')) {
          try {
            const domain = new URL(this.homeserverUrl).hostname;
            const baseUsername = this.username.startsWith('@') ? this.username : `@${this.username}`;
            usernameFormats.push(`${baseUsername}:${domain}`);
          } catch (e) {
            console.log('[TokenManager] Could not extract domain from homeserver URL for username formatting');
          }
        }
        
        let lastError: any;
        for (const usernameFormat of usernameFormats) {
          try {
            console.log(`[TokenManager] Trying username format: ${usernameFormat}`);
            const loginResult = await client.loginWithPassword(usernameFormat, this.password);
            console.log(`[TokenManager] Login successful with username format: ${usernameFormat}`);
            
            return {
              access_token: loginResult.access_token,
              refresh_token: loginResult.refresh_token,
              expires_in_ms: loginResult.expires_in_ms,
              device_id: loginResult.device_id
            };
          } catch (error: any) {
            console.log(`[TokenManager] Login failed with username format "${usernameFormat}": ${error.message}`);
            lastError = error;
            // Continue to next format
          }
        }
        
        // If all formats failed, throw the last error
        throw lastError;
      }

      // If we only have access token and no refresh token, we can't get a new token
      throw new Error('No refresh token available and no username/password provided for fallback authentication');
    } catch (error: any) {
      throw new Error(`Failed to get new access token: ${error.message}`);
    }
  }

  /**
   * Check if an error indicates token expiration/invalidity
   */
  isTokenError(error: any): boolean {
    const errcode = (error as any)?.errcode;
    if (typeof errcode !== 'string') {
      return false;
    }
    return errcode === 'M_UNKNOWN_TOKEN' ||
           errcode === 'M_MISSING_TOKEN' ||
           errcode === 'M_FORBIDDEN';
  }

  /**
   * Refresh the token and notify the callback
   */
  async refreshToken(): Promise<LoginResponse> {
    if (this.refreshInProgress) {
      throw new Error('Token refresh already in progress');
    }

    this.refreshInProgress = true;
    try {
      console.log('[TokenManager] Refreshing access token...');
      const result = await this.getNewToken();
      
      // Update our refresh token if we got a new one
      if (result.refresh_token) {
        this.currentRefreshToken = result.refresh_token;
      }
      
      if (this.onTokenRefresh) {
        await this.onTokenRefresh(result.access_token, result.refresh_token);
      }
      
      console.log('[TokenManager] Access token refreshed successfully');
      return result;
    } finally {
      this.refreshInProgress = false;
    }
  }

  /**
   * Create a wrapper function that automatically handles token refresh
   */
  withTokenRefresh<T>(fn: () => Promise<T>): () => Promise<T> {
    return async (): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        if (this.isTokenError(error)) {
          console.log('[TokenManager] Token error detected, attempting refresh...');
          await this.refreshToken();
          // Retry the operation once after token refresh
          return await fn();
        }
        throw error;
      }
    };
  }

  /**
   * Get token status information (without revealing actual token values)
   */
  getTokenStatus(): {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    hasCredentials: boolean;
    refreshInProgress: boolean;
  } {
    return {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.currentRefreshToken,
      hasCredentials: !!(this.username && this.password),
      refreshInProgress: this.refreshInProgress
    };
  }
}
