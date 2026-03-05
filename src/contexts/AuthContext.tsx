import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface User {
  login: string;
  avatarUrl: string;
  token: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_KEY = 'gwitter_auth_token';
const USER_KEY = 'gwitter_auth_user';

interface AuthProviderProps {
  children: ReactNode;
  clientId: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, clientId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser({ ...parsedUser, token: storedToken });
      } catch (e) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.result && data.result.includes('access_token=')) {
          const token = data.result.replace('access_token=', '');
          fetchUserInfo(token);
        }
      } catch (e) {
        console.error('Failed to parse OAuth message:', e);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const userInfo: User = {
          login: data.login,
          avatarUrl: data.avatar_url,
          token: token
        };
        setUser(userInfo);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify({
          login: data.login,
          avatarUrl: data.avatar_url
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const login = useCallback(() => {
    const redirectUri = window.location.origin + window.location.pathname;
    const oauthUrl = `${GITHUB_OAUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_repo,user`;
    
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      oauthUrl,
      'GitHub OAuth',
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );
  }, [clientId]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const value: AuthContextType = {
    isAuthenticated: !!user,
    user,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
