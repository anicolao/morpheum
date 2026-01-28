import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenManager } from './token-manager';

// Mock matrix-js-sdk
const mockCreateClient = vi.fn();

vi.mock('matrix-js-sdk', () => ({
  createClient: mockCreateClient,
}));

describe('TokenManager Integration', () => {
  let tokenManager: TokenManager;
  let tokenRefreshCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    tokenRefreshCallback = vi.fn();
    
    tokenManager = new TokenManager({
      homeserverUrl: 'https://matrix.example.com',
      username: 'testbot',
      password: 'testpass',
      onTokenRefresh: tokenRefreshCallback
    });
  });

  it('should demonstrate complete token refresh workflow', async () => {
    // Setup mock client for successful token refresh
    const mockClient = {
      loginWithPassword: vi.fn().mockResolvedValue({ 
        access_token: 'new_fresh_token',
        refresh_token: 'new_refresh_token_456'
      })
    };
    mockCreateClient.mockReturnValue(mockClient);

    // Simulate a function that would normally call Matrix API
    let callCount = 0;
    const mockMatrixOperation = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First call fails with token error
        throw { errcode: 'M_UNKNOWN_TOKEN', error: 'Token expired' };
      }
      // Second call succeeds
      return 'operation_successful';
    });

    // Wrap the operation with token refresh
    const wrappedOperation = tokenManager.withTokenRefresh(mockMatrixOperation);

    // Execute the operation
    const result = await wrappedOperation();

    // Verify the workflow
    expect(result).toBe('operation_successful');
    expect(mockMatrixOperation).toHaveBeenCalledTimes(2); // Failed once, succeeded once
    expect(tokenRefreshCallback).toHaveBeenCalledWith('new_fresh_token', 'new_refresh_token_456');
    expect(mockClient.loginWithPassword).toHaveBeenCalledWith('testbot', 'testpass');
  });

  it('should handle scenarios where token refresh is not needed', async () => {
    const mockMatrixOperation = vi.fn().mockResolvedValue('success_without_refresh');
    const wrappedOperation = tokenManager.withTokenRefresh(mockMatrixOperation);

    const result = await wrappedOperation();

    expect(result).toBe('success_without_refresh');
    expect(mockMatrixOperation).toHaveBeenCalledTimes(1);
    expect(tokenRefreshCallback).not.toHaveBeenCalled();
  });

  it('should propagate non-token errors without refresh attempt', async () => {
    const mockMatrixOperation = vi.fn().mockRejectedValue(new Error('Network error'));
    const wrappedOperation = tokenManager.withTokenRefresh(mockMatrixOperation);

    await expect(wrappedOperation()).rejects.toThrow('Network error');
    expect(mockMatrixOperation).toHaveBeenCalledTimes(1);
    expect(tokenRefreshCallback).not.toHaveBeenCalled();
  });

  it('should demonstrate rate limiting compatibility', async () => {
    // This shows that M_LIMIT_EXCEEDED is NOT treated as a token error
    const rateLimitError = { errcode: 'M_LIMIT_EXCEEDED', error: 'Too many requests' };
    const mockMatrixOperation = vi.fn().mockRejectedValue(rateLimitError);
    const wrappedOperation = tokenManager.withTokenRefresh(mockMatrixOperation);

    await expect(wrappedOperation()).rejects.toThrow();
    expect(mockMatrixOperation).toHaveBeenCalledTimes(1);
    expect(tokenRefreshCallback).not.toHaveBeenCalled();
  });
});
