import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name?: string;
  email?: string;
  bio?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
const STORAGE_KEY = 'gwitter_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从 localStorage 恢复登录状态
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const authData = JSON.parse(stored);
        if (authData.token && authData.user) {
          setToken(authData.token);
          setUser(authData.user);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to parse auth data:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // 获取 GitHub 用户信息
  const fetchGitHubUser = useCallback(async (accessToken: string): Promise<GitHubUser> => {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }, []);

  // 处理 OAuth 回调
  const handleOAuthCallback = useCallback(async (code: string) => {
    try {
      // 使用 CORS 代理获取 access_token
      const proxyUrl = 'https://cors-anywhere.azm.workers.dev/https://github.com/login/oauth/access_token';
      const clientSecret = import.meta.env.VITE_GITHUB_CLIENT_SECRET || '';

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GITHUB_CLIENT_ID,
          client_secret: clientSecret,
          code: code,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      const accessToken = data.access_token;

      // 获取用户信息
      const userInfo = await fetchGitHubUser(accessToken);

      // 保存登录状态
      const authData = {
        token: accessToken,
        user: userInfo,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));

      setToken(accessToken);
      setUser(userInfo);
      setIsAuthenticated(true);

      return true;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }, [fetchGitHubUser]);

  // 登录
  const login = useCallback(async () => {
    if (!GITHUB_CLIENT_ID) {
      alert('GitHub Client ID 未配置，请联系管理员');
      return;
    }

    const redirectUri = window.location.origin + '/oauth-callback.html';
    const scope = 'public_repo read:user user:email';
    const state = Math.random().toString(36).substring(7);

    // 保存 state 用于验证
    sessionStorage.setItem('oauth_state', state);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

    // 打开弹出窗口
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'GitHub OAuth',
      `width=${width},height=${height},left=${left},top=${top},popup=true`
    );

    if (!popup) {
      alert('请允许弹出窗口以完成登录');
      return;
    }

    // 监听消息
    return new Promise<void>((resolve, reject) => {
      const messageHandler = async (event: MessageEvent) => {
        // 验证消息来源
        if (event.origin !== window.location.origin) {
          return;
        }

        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            reject(new Error(data.error));
            return;
          }

          // 从 URL 参数中提取 code
          const urlParams = new URLSearchParams(data.result);
          const code = urlParams.get('access_token');

          if (!code) {
            reject(new Error('No authorization code received'));
            return;
          }

          await handleOAuthCallback(code);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      // 超时处理
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Login timeout'));
      }, 120000);
    });
  }, [handleOAuthCallback]);

  // 登出
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // 检查 URL 参数（OAuth 回调）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code) {
      // 验证 state
      const savedState = sessionStorage.getItem('oauth_state');
      if (state && state !== savedState) {
        console.error('Invalid state parameter');
        return;
      }

      // 清除 URL 参数
      window.history.replaceState({}, document.title, window.location.pathname);

      // 处理回调
      handleOAuthCallback(code).catch(console.error);
    }
  }, [handleOAuthCallback]);

  // 检查 sessionStorage（从 oauth-callback.html 返回）
  useEffect(() => {
    const code = sessionStorage.getItem('github_oauth_code');
    const state = sessionStorage.getItem('github_oauth_state');

    if (code) {
      // 清除 sessionStorage
      sessionStorage.removeItem('github_oauth_code');
      sessionStorage.removeItem('github_oauth_state');

      // 验证 state
      const savedState = sessionStorage.getItem('oauth_state');
      if (state && state !== savedState) {
        console.error('Invalid state parameter');
        return;
      }

      // 处理回调
      handleOAuthCallback(code).catch(console.error);
    }
  }, [handleOAuthCallback]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
