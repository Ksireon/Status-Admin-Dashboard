import { API_URL } from './constants';
import { AuthResponse } from './types';

// Helper to check if token is about to expire (within 5 minutes)
function isTokenExpiringSoon(token: string): boolean {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const { exp } = JSON.parse(jsonPayload);
    // Check if token expires in less than 5 minutes
    return exp * 1000 - Date.now() < 5 * 60 * 1000;
  } catch {
    return true; // Assume expiring if can't decode
  }
}

// Simple logger for production
const isDev = process.env.NODE_ENV === 'development';
const logger = {
  log: (...args: unknown[]) => isDev && console.log(...args),
  error: (...args: unknown[]) => isDev && console.error(...args),
  warn: (...args: unknown[]) => isDev && console.warn(...args),
};

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      // Try to restore session if we have tokens
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Try to refresh token on page load
        this.refreshToken().then((refreshed) => {
          if (refreshed) {
            logger.log('Session restored on page load');
            this.startAutoRefresh();
          } else {
            logger.log('Failed to restore session, clearing tokens');
            this.logout();
          }
        });
      }
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
        // Start auto-refresh when token is set
        this.startAutoRefresh();
      } else {
        localStorage.removeItem('accessToken');
        // Stop auto-refresh when token is cleared
        this.stopAutoRefresh();
      }
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check if token is about to expire and refresh it proactively
    if (this.accessToken && isTokenExpiringSoon(this.accessToken)) {
      logger.log('Token expiring soon, refreshing proactively...');
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        this.logout();
        throw new Error('Session expired');
      }
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    logger.log(`API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    logger.log(`API Response: ${response.status}`);

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request(endpoint, options);
      } else {
        this.logout();
        throw new Error('Session expired');
      }
    }

    const data = await response.json().catch(() => ({ message: 'Unknown error' }));
    logger.log('API Data:', data);

    if (!response.ok) {
      throw new Error(data.message || data.error?.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const result = await this.request<{ data: AuthResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Backend wraps response in "data" field
    const response = result.data;

    this.setAccessToken(response.accessToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      // Start auto-refresh after login
      this.startAutoRefresh();
    }

    return response;
  }

  async refreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      logger.log('No refresh token available');
      return false;
    }

    try {
      logger.log('Refreshing token...');
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        logger.error('Refresh failed:', response.status);
        return false;
      }

      const result = await response.json();
      logger.log('Refresh response:', result);
      
      // Handle wrapped response
      const data = result.data || result;
      
      if (data.accessToken) {
        this.setAccessToken(data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        logger.log('Token refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Refresh error:', error);
      return false;
    }
  }

  // Start automatic token refresh every 4 minutes (token expires in 15 min)
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Refresh every 4 minutes to stay ahead of 15 min expiration
    this.refreshInterval = setInterval(async () => {
      logger.log('Auto-refreshing token...');
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        logger.log('Auto-refresh failed, stopping interval');
        this.stopAutoRefresh();
      }
    }, 4 * 60 * 1000); // 4 minutes
    
    logger.log('Auto-refresh started');
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      logger.log('Auto-refresh stopped');
    }
  }

  logout() {
    this.stopAutoRefresh();
    this.setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const result = await this.request<{ data: T }>(endpoint, { method: 'GET' });
    return result.data;
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    logger.log(`API POST ${endpoint} body:`, body);
    const result = await this.request<{ data: T }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    logger.log(`API POST ${endpoint} result:`, result);
    return result.data;
  }

  async patch<T>(endpoint: string, body: unknown): Promise<T> {
    const result = await this.request<{ data: T }>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return result.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const result = await this.request<{ data: T }>(endpoint, { method: 'DELETE' });
    return result.data;
  }

  // Upload file with FormData - sends directly to backend to avoid proxy issues
  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    // Check if token is about to expire and refresh it proactively
    if (this.accessToken && isTokenExpiringSoon(this.accessToken)) {
      logger.log('Token expiring soon, refreshing before upload...');
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        this.logout();
        throw new Error('Session expired');
      }
    }

    // For file uploads, send directly to backend to avoid Next.js proxy issues with multipart/form-data
    const backendUrl = 'http://64.112.127.107:3000/api/v1';
    const url = `${backendUrl}${endpoint}`;
    
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    // Don't set Content-Type - browser will set it with proper boundary for FormData

    logger.log(`API Upload: POST ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    logger.log(`API Upload Response: ${response.status}`);

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.uploadFile(endpoint, formData);
      } else {
        this.logout();
        throw new Error('Session expired');
      }
    }

    const data = await response.json().catch(() => ({ message: 'Unknown error' }));
    logger.log('API Upload Data:', data);

    if (!response.ok) {
      throw new Error(data.message || data.error?.message || `HTTP error! status: ${response.status}`);
    }

    return data.data || data;
  }
}

export const api = new ApiClient(API_URL);
