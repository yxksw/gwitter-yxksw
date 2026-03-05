import React, { useEffect, useState } from 'react';
import { GwitterConfig } from '../config/gwitter.config';

interface CustomAuthProps {
  config: GwitterConfig;
  onLoginSuccess: (token: string) => void;
  onLoginError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const CustomAuth: React.FC<CustomAuthProps> = ({
  config,
  onLoginSuccess,
  onLoginError,
  isLoading,
  setIsLoading
}) => {
  // 处理 GitHub OAuth 回调
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // 清除 URL 中的 code 参数
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // 打开登录弹窗
  const handleLogin = () => {
    setIsLoading(true);
    
    // 计算弹窗位置
    const windowArea = {
      width: Math.max(Math.floor(window.outerWidth * 0.4), 400),
      height: Math.max(Math.floor(window.outerHeight * 0.4), 400),
      left: Math.floor(window.screenX + (window.outerWidth - Math.max(Math.floor(window.outerWidth * 0.4), 400)) / 2),
      top: Math.floor(window.screenY + (window.outerHeight - Math.max(Math.floor(window.outerHeight * 0.4), 400)) / 3),
    };

    const windowOpts = `toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0,width=${windowArea.width},height=${windowArea.height},left=${windowArea.left},top=${windowArea.top}`;

    // 构建 GitHub OAuth URL
    const githubOauthUrl = 'https://github.com/login/oauth/authorize';
    const query = {
      client_id: config.request.clientID,
      redirect_uri: `${window.location.origin}/callback.html`,
      scope: 'public_repo',
      state: JSON.stringify({
        client_id: config.request.clientID,
        client_secret: config.request.clientSecret,
      }),
    };
    
    const loginLink = `${githubOauthUrl}?${new URLSearchParams(query).toString()}`;
    const authWindow = window.open(loginLink, 'Gwitter OAuth Application', windowOpts);

    if (!authWindow) {
      setIsLoading(false);
      onLoginError('Failed to open authentication window');
      return;
    }

    // 监听消息
    const handleMessage = (event: MessageEvent) => {
      // 确保消息来自同一个源
      if (event.origin !== window.location.origin) {
        return;
      }

      try {
        const { result, error } = JSON.parse(event.data);
        
        if (error) {
          setIsLoading(false);
          onLoginError(error);
        } else if (result) {
          setIsLoading(false);
          onLoginSuccess(result);
        }
      } catch (err) {
        // 忽略非 JSON 消息
      }
    };

    window.addEventListener('message', handleMessage);

    // 检查窗口是否关闭
    const checkWindowClosed = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkWindowClosed);
        window.removeEventListener('message', handleMessage);
        setIsLoading(false);
        onLoginError('Window closed by user');
      }
    }, 500);

    // 清理函数
    return () => {
      clearInterval(checkWindowClosed);
      window.removeEventListener('message', handleMessage);
    };
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      style={{
        padding: '8px 16px',
        backgroundColor: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '500',
      }}
    >
      {isLoading ? '登录中...' : 'GitHub 登录'}
    </button>
  );
};
