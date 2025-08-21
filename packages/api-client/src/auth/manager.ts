import { EventEmitter } from 'events';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthManagerConfig {
  apiUrl: string;
  storage: AuthStorage;
  onAuthStateChange?: (state: AuthState) => void;
  onTokenRefresh?: (tokens: AuthTokens) => void;
  onError?: (error: any) => void;
}

export interface AuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Authentication manager for handling tokens, user state, and auth flows
 */
export class AuthManager extends EventEmitter {
  private state: AuthState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private config: AuthManagerConfig;

  constructor(config: AuthManagerConfig) {
    super();
    this.config = config;
    this.initialize();
  }

  /**
   * Initialize auth manager and restore session
   */
  private async initialize() {
    try {
      await this.restoreSession();
    } catch (error) {
      console.error('Failed to restore session:', error);
      this.config.onError?.(error);
    } finally {
      this.updateState({ isLoading: false });
    }
  }

  /**
   * Restore session from storage
   */
  private async restoreSession() {
    const [tokensJson, userJson] = await Promise.all([
      this.config.storage.getItem('auth_tokens'),
      this.config.storage.getItem('auth_user'),
    ]);

    if (tokensJson && userJson) {
      const tokens: AuthTokens = JSON.parse(tokensJson);
      const user: User = JSON.parse(userJson);

      // Check if tokens are still valid
      if (tokens.expiresAt > Date.now()) {
        this.updateState({
          user,
          tokens,
          isAuthenticated: true,
        });
        this.scheduleTokenRefresh(tokens);
      } else {
        // Try to refresh tokens
        await this.refreshTokens();
      }
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<void> {
    try {
      this.updateState({ isLoading: true });

      const response = await fetch(`${this.config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      await this.setAuthData(data.user, data.tokens);
    } catch (error) {
      this.config.onError?.(error);
      throw error;
    } finally {
      this.updateState({ isLoading: false });
    }
  }

  /**
   * Register new user
   */
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    try {
      this.updateState({ isLoading: true });

      const response = await fetch(`${this.config.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data = await response.json();
      await this.setAuthData(data.user, data.tokens);
    } catch (error) {
      this.config.onError?.(error);
      throw error;
    } finally {
      this.updateState({ isLoading: false });
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint if tokens exist
      if (this.state.tokens) {
        await fetch(`${this.config.apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.state.tokens.accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      await this.clearAuthData();
    }
  }

  /**
   * Refresh access token
   */
  async refreshTokens(): Promise<void> {
    if (!this.state.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.state.tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      await this.setAuthData(this.state.user!, data.tokens);
      this.config.onTokenRefresh?.(data.tokens);
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearAuthData();
      throw error;
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.state.tokens?.accessToken || null;
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.state.user;
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Set authentication data
   */
  private async setAuthData(user: User, tokens: AuthTokens) {
    await Promise.all([
      this.config.storage.setItem('auth_user', JSON.stringify(user)),
      this.config.storage.setItem('auth_tokens', JSON.stringify(tokens)),
    ]);

    this.updateState({
      user,
      tokens,
      isAuthenticated: true,
    });

    this.scheduleTokenRefresh(tokens);
  }

  /**
   * Clear authentication data
   */
  private async clearAuthData() {
    await Promise.all([
      this.config.storage.removeItem('auth_user'),
      this.config.storage.removeItem('auth_tokens'),
    ]);

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.updateState({
      user: null,
      tokens: null,
      isAuthenticated: false,
    });
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(tokens: AuthTokens) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Refresh 5 minutes before expiration
    const refreshTime = tokens.expiresAt - Date.now() - 5 * 60 * 1000;
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTokens().catch(error => {
          console.error('Automatic token refresh failed:', error);
          this.config.onError?.(error);
        });
      }, refreshTime);
    }
  }

  /**
   * Update internal state and notify listeners
   */
  private updateState(updates: Partial<AuthState>) {
    this.state = { ...this.state, ...updates };
    this.emit('stateChange', this.state);
    this.config.onAuthStateChange?.(this.state);
  }
}