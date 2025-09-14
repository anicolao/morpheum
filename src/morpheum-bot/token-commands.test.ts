import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MorpheumBot } from './bot';
import { TokenManager } from './token-manager';

describe('Token Commands', () => {
  let mockSendMessage: vi.Mock;
  let mockTokenManager: Partial<TokenManager>;

  beforeEach(() => {
    mockSendMessage = vi.fn();
    mockTokenManager = {
      getTokenStatus: vi.fn(),
      refreshToken: vi.fn(),
    };
  });

  describe('!tokens command', () => {
    it('should show static token mode when no token manager', async () => {
      const bot = new MorpheumBot(); // No token manager
      
      await bot.processMessage('!tokens', 'test-user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Static token mode')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Using ACCESS_TOKEN environment variable')
      );
    });

    it('should show token status when token manager is available', async () => {
      (mockTokenManager.getTokenStatus as vi.Mock).mockReturnValue({
        hasAccessToken: true,
        hasRefreshToken: true,
        hasCredentials: true,
        refreshInProgress: false
      });
      
      const bot = new MorpheumBot(mockTokenManager as TokenManager);
      
      await bot.processMessage('!tokens', 'test-user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('✅ Available')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Automatic token refresh is enabled')
      );
    });

    it('should show warning when credentials are missing', async () => {
      (mockTokenManager.getTokenStatus as vi.Mock).mockReturnValue({
        hasAccessToken: true,
        hasRefreshToken: false,
        hasCredentials: false,
        refreshInProgress: false
      });
      
      const bot = new MorpheumBot(mockTokenManager as TokenManager);
      
      await bot.processMessage('!tokens', 'test-user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('❌ Not available')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Token refresh may not work properly')
      );
    });
  });

  describe('!token refresh command', () => {
    it('should show error when no token manager available', async () => {
      const bot = new MorpheumBot(); // No token manager
      
      await bot.processMessage('!token refresh', 'test-user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('❌ Manual token refresh not available')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Static token (ACCESS_TOKEN only)')
      );
    });

    it('should show error when credentials are missing', async () => {
      (mockTokenManager.getTokenStatus as vi.Mock).mockReturnValue({
        hasAccessToken: true,
        hasRefreshToken: false,
        hasCredentials: false,
        refreshInProgress: false
      });
      
      const bot = new MorpheumBot(mockTokenManager as TokenManager);
      
      await bot.processMessage('!token refresh', 'test-user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('❌ Cannot refresh token: Missing credentials')
      );
    });

    it('should show warning when refresh is already in progress', async () => {
      (mockTokenManager.getTokenStatus as vi.Mock).mockReturnValue({
        hasAccessToken: true,
        hasRefreshToken: true,
        hasCredentials: true,
        refreshInProgress: true
      });
      
      const bot = new MorpheumBot(mockTokenManager as TokenManager);
      
      await bot.processMessage('!token refresh', 'test-user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Token refresh already in progress')
      );
    });

    it('should successfully refresh token', async () => {
      (mockTokenManager.getTokenStatus as vi.Mock).mockReturnValue({
        hasAccessToken: true,
        hasRefreshToken: true,
        hasCredentials: true,
        refreshInProgress: false
      });
      
      const mockRefreshResult = {
        access_token: 'new-token',
        refresh_token: 'new-refresh-token',
        expires_in_ms: 3600000,
        device_id: 'device123'
      };
      (mockTokenManager.refreshToken as vi.Mock).mockResolvedValue(mockRefreshResult);
      
      const bot = new MorpheumBot(mockTokenManager as TokenManager);
      
      await bot.processMessage('!token refresh', 'test-user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('🔄 Starting manual token refresh')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('✅ Token refresh successful!')
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('60 minutes')
      );
    });

    it('should handle refresh token errors', async () => {
      (mockTokenManager.getTokenStatus as vi.Mock).mockReturnValue({
        hasAccessToken: true,
        hasRefreshToken: true,
        hasCredentials: true,
        refreshInProgress: false
      });
      
      (mockTokenManager.refreshToken as vi.Mock).mockRejectedValue(
        new Error('Server connection failed')
      );
      
      const bot = new MorpheumBot(mockTokenManager as TokenManager);
      
      await bot.processMessage('!token refresh', 'test-user', mockSendMessage);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('❌ Token refresh failed: Server connection failed')
      );
    });
  });

  describe('help command', () => {
    it('should include token commands in help text', async () => {
      const bot = new MorpheumBot();
      
      await bot.processMessage('!help', 'test-user', mockSendMessage);
      
      // With the enhanced help command, sendMarkdownMessage is called with both markdown and HTML
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!tokens'),
        expect.any(String) // HTML version
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.stringContaining('!token refresh'),
        expect.any(String) // HTML version
      );
    });
  });
});