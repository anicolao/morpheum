import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenManager } from './token-manager';

// Mock matrix-js-sdk
const mockCreateClient = vi.fn();

vi.mock('matrix-js-sdk', () => ({
  createClient: mockCreateClient,
}));

describe('TokenManager', () => {
  let tokenManager: TokenManager;
  let mockOnTokenRefresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnTokenRefresh = vi.fn();
    
    tokenManager = new TokenManager({
      homeserverUrl: 'https://test.example.com',
      username: 'testuser',
      password: 'testpass',
      onTokenRefresh: mockOnTokenRefresh
    });
  });

  describe('getNewToken', () => {
    it('should successfully get a new token using password', async () => {
      const mockClient = {
        loginWithPassword: vi.fn().mockResolvedValue({ 
          access_token: 'new_token_123',
          refresh_token: 'refresh_token_456',
          expires_in_ms: 3600000 
        })
      };
      mockCreateClient.mockReturnValue(mockClient);

      const result = await tokenManager.getNewToken();

      expect(result).toEqual({
        access_token: 'new_token_123',
        refresh_token: 'refresh_token_456',
        expires_in_ms: 3600000,
        device_id: undefined
      });
      expect(mockCreateClient).toHaveBeenCalledWith({
        baseUrl: 'https://test.example.com'
      });
      expect(mockClient.loginWithPassword).toHaveBeenCalledWith('testuser', 'testpass');
    });

    it('should successfully refresh using refresh token', async () => {
      const mockClient = {
        refreshToken: vi.fn().mockResolvedValue({ 
          access_token: 'refreshed_token_123',
          refresh_token: 'new_refresh_token_456',
          expires_in_ms: 3600000 
        })
      };
      mockCreateClient.mockReturnValue(mockClient);

      // Set a refresh token
      tokenManager.setRefreshToken('existing_refresh_token');

      const result = await tokenManager.getNewToken();

      expect(result).toEqual({
        access_token: 'refreshed_token_123',
        refresh_token: 'new_refresh_token_456',
        expires_in_ms: 3600000
      });
      expect(mockClient.refreshToken).toHaveBeenCalledWith('existing_refresh_token');
    });

    it('should fallback to password when refresh token fails', async () => {
      const mockClient = {
        refreshToken: vi.fn().mockRejectedValue(new Error('Invalid refresh token')),
        loginWithPassword: vi.fn().mockResolvedValue({ 
          access_token: 'password_token_123',
          refresh_token: 'new_refresh_token_789'
        })
      };
      mockCreateClient.mockReturnValue(mockClient);

      // Set a refresh token
      tokenManager.setRefreshToken('invalid_refresh_token');

      const result = await tokenManager.getNewToken();

      expect(result).toEqual({
        access_token: 'password_token_123',
        refresh_token: 'new_refresh_token_789',
        expires_in_ms: undefined,
        device_id: undefined
      });
      expect(mockClient.refreshToken).toHaveBeenCalledWith('invalid_refresh_token');
      expect(mockClient.loginWithPassword).toHaveBeenCalledWith('testuser', 'testpass');
    });

    it('should throw error when login fails', async () => {
      const mockClient = {
        loginWithPassword: vi.fn().mockRejectedValue(new Error('Login failed'))
      };
      mockCreateClient.mockReturnValue(mockClient);

      await expect(tokenManager.getNewToken()).rejects.toThrow('Failed to get new access token: Login failed');
    });
  });

  describe('isTokenError', () => {
    it('should detect M_UNKNOWN_TOKEN error', () => {
      const error = { errcode: 'M_UNKNOWN_TOKEN', error: 'Unknown token' };
      expect(tokenManager.isTokenError(error)).toBe(true);
    });

    it('should detect M_MISSING_TOKEN error', () => {
      const error = { errcode: 'M_MISSING_TOKEN', error: 'Missing token' };
      expect(tokenManager.isTokenError(error)).toBe(true);
    });

    it('should detect M_FORBIDDEN error', () => {
      const error = { errcode: 'M_FORBIDDEN', error: 'Forbidden' };
      expect(tokenManager.isTokenError(error)).toBe(true);
    });

    it('should not detect other errors as token errors', () => {
      const error = { errcode: 'M_LIMIT_EXCEEDED', error: 'Rate limited' };
      expect(tokenManager.isTokenError(error)).toBe(false);
    });

    it('should not detect non-MatrixError as token error', () => {
      const error = new Error('Generic error');
      expect(tokenManager.isTokenError(error)).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token and call callback', async () => {
      const mockClient = {
        loginWithPassword: vi.fn().mockResolvedValue({ 
          access_token: 'refreshed_token_456',
          refresh_token: 'new_refresh_token_789' 
        })
      };
      mockCreateClient.mockReturnValue(mockClient);

      const result = await tokenManager.refreshToken();

      expect(result).toEqual({
        access_token: 'refreshed_token_456',
        refresh_token: 'new_refresh_token_789',
        expires_in_ms: undefined,
        device_id: undefined
      });
      expect(mockOnTokenRefresh).toHaveBeenCalledWith('refreshed_token_456', 'new_refresh_token_789');
    });

    it('should prevent concurrent refresh attempts', async () => {
      const mockClient = {
        loginWithPassword: vi.fn().mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve({ 
            access_token: 'refreshed_token_456',
            refresh_token: 'new_refresh_token_789' 
          }), 100)
        ))
      };
      mockCreateClient.mockReturnValue(mockClient);

      const refresh1 = tokenManager.refreshToken();
      const refresh2Promise = tokenManager.refreshToken();

      await expect(refresh2Promise).rejects.toThrow('Token refresh already in progress');
      await refresh1; // Let the first refresh complete
    });
  });

  describe('withTokenRefresh', () => {
    it('should execute function normally when no token error', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const wrappedFn = tokenManager.withTokenRefresh(mockFn);

      const result = await wrappedFn();

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockOnTokenRefresh).not.toHaveBeenCalled();
    });

    it('should refresh token and retry when token error occurs', async () => {
      const mockClient = {
        loginWithPassword: vi.fn().mockResolvedValue({ 
          access_token: 'new_token_789',
          refresh_token: 'new_refresh_token_123' 
        })
      };
      mockCreateClient.mockReturnValue(mockClient);

      const mockFn = vi.fn()
        .mockRejectedValueOnce({ errcode: 'M_UNKNOWN_TOKEN', error: 'Unknown token' })
        .mockResolvedValueOnce('success_after_refresh');
      
      const wrappedFn = tokenManager.withTokenRefresh(mockFn);

      const result = await wrappedFn();

      expect(result).toBe('success_after_refresh');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockOnTokenRefresh).toHaveBeenCalledWith('new_token_789', 'new_refresh_token_123');
    });

    it('should throw non-token errors without retry', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Network error'));
      const wrappedFn = tokenManager.withTokenRefresh(mockFn);

      await expect(wrappedFn()).rejects.toThrow('Network error');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockOnTokenRefresh).not.toHaveBeenCalled();
    });
  });

  describe('setRefreshToken', () => {
    it('should store refresh token for later use', () => {
      tokenManager.setRefreshToken('test_refresh_token');
      // Verify it's set by checking if it's used in getNewToken
      const mockClient = {
        refreshToken: vi.fn().mockResolvedValue({ 
          access_token: 'refreshed_token',
          refresh_token: 'new_refresh_token',
          expires_in_ms: 3600000 
        })
      };
      mockCreateClient.mockReturnValue(mockClient);

      return tokenManager.getNewToken().then(() => {
        expect(mockClient.refreshToken).toHaveBeenCalledWith('test_refresh_token');
      });
    });

    it('should clear refresh token when set to undefined', async () => {
      // First set a refresh token
      tokenManager.setRefreshToken('test_refresh_token');
      
      // Then clear it
      tokenManager.setRefreshToken(undefined);
      
      // Should now use password authentication
      const mockClient = {
        loginWithPassword: vi.fn().mockResolvedValue({ 
          access_token: 'password_token'
        })
      };
      mockCreateClient.mockReturnValue(mockClient);

      await tokenManager.getNewToken();
      
      expect(mockClient.loginWithPassword).toHaveBeenCalledWith('testuser', 'testpass');
    });
  });

  describe('getTokenStatus', () => {
    it('should return correct status information', () => {
      const tokenManagerWithToken = new TokenManager({
        homeserverUrl: 'https://test.example.com',
        username: 'testuser',
        password: 'testpass',
        accessToken: 'test_access_token'
      });
      
      tokenManagerWithToken.setRefreshToken('test_refresh_token');
      
      const status = tokenManagerWithToken.getTokenStatus();
      
      expect(status).toEqual({
        hasAccessToken: true,
        hasRefreshToken: true,
        hasCredentials: true,
        refreshInProgress: false
      });
    });

    it('should return correct status when missing credentials', () => {
      const tokenManagerNoCredentials = new TokenManager({
        homeserverUrl: 'https://test.example.com',
        accessToken: 'test_access_token'
      });
      
      const status = tokenManagerNoCredentials.getTokenStatus();
      
      expect(status).toEqual({
        hasAccessToken: true,
        hasRefreshToken: false,
        hasCredentials: false,
        refreshInProgress: false
      });
    });
  });
});
