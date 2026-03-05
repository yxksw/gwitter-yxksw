import gwitter from 'gwitter';
import 'gwitter/dist/gwitter.min.css';
import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { GwitterConfig, config } from './config/gwitter.config';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthButton } from './components/AuthButton';
import { ProtectedGwitter } from './components/ProtectedGwitter';

// 内部组件，使用 useAuth
function AppContent() {
  const [currentConfig, setCurrentConfig] = useState<GwitterConfig>(config);
  const { isAuthenticated, user } = useAuth();

  // 处理 GitHub OAuth 回调
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && window.opener) {
      window.opener.postMessage(
        JSON.stringify({ result: 'access_token=' + code, error: null }),
        '*'
      );
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><h2>✅ 授权成功，正在关闭窗口...</h2></div>';
      setTimeout(() => window.close(), 1500);
    }
  }, []);

  // 当用户登录状态改变时，更新 Gwitter 配置
  useEffect(() => {
    if (isAuthenticated && user) {
      setCurrentConfig(prev => ({
        ...prev,
        request: {
          ...prev.request,
          token: user.token,
        }
      }));
    } else {
      setCurrentConfig(prev => ({
        ...prev,
        request: {
          ...prev.request,
          token: '',
        }
      }));
    }
  }, [isAuthenticated, user]);

  const initializeGwitter = useCallback((config: GwitterConfig) => {
    setTimeout(() => {
      try {
        const container = document.getElementById('gwitter-container');
        if (container) {
          container.innerHTML = '';
        }

        gwitter({
          container: document.getElementById('gwitter-container'),
          config,
        });
      } catch (error) {
        console.error('Failed to initialize Gwitter:', error);
        const container = document.getElementById('gwitter-container');
        if (container) {
          container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666;">
              <h3>⚠️ Configuration Error</h3>
              <p>Please check your GitHub configuration and try again.</p>
              <p><strong>Error:</strong> ${
                error instanceof Error ? error.message : 'Unknown error'
              }</p>
            </div>
          `;
        }
      }
    }, 0);
  }, []);

  useEffect(() => {
    initializeGwitter(currentConfig);
  }, [currentConfig, initializeGwitter]);

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-title">
            <h1>🐦 Gwitter - 异飨客</h1>
            <p>
              这是一个基于 GitHub API 的 Twitter 风格微博，你能在这里看到我的日常~
            </p>
          </div>
          <div className="header-auth">
            <AuthButton />
          </div>
        </div>
        {!isAuthenticated && (
          <div className="login-notice">
            <p>💡 登录后可以评论、点赞和参与互动</p>
          </div>
        )}
      </header>

      <main className="App-main">
        <div className="demo-info">
          <h2>📋 Current Configuration</h2>
          <div className="config-display">
            <div className="config-item">
              <strong>Owner:</strong> {currentConfig.request.owner}
            </div>
            <div className="config-item">
              <strong>Repository:</strong> {currentConfig.request.repo}
            </div>
            <div className="config-item">
              <strong>Page Size:</strong> {currentConfig.request.pageSize}
            </div>
            <div className="config-item">
              <strong>Only Show Owner:</strong>{' '}
              {currentConfig.app?.onlyShowOwner ? 'Yes' : 'No'}
            </div>
            <div className="config-item">
              <strong>Enable About:</strong>{' '}
              {currentConfig.app?.enableAbout ? 'Yes' : 'No'}
            </div>
            <div className="config-item">
              <strong>Login Status:</strong>{' '}
              {isAuthenticated ? (
                <span className="status-logged-in">✅ 已登录 ({user?.login})</span>
              ) : (
                <span className="status-not-logged-in">❌ 未登录</span>
              )}
            </div>
          </div>
        </div>

        <ProtectedGwitter>
          <div id="gwitter-container" className="gwitter-demo-container"></div>
        </ProtectedGwitter>
      </main>

      <footer className="App-footer">
        <div className="footer-links">
          <a
            href="https://github.com/SimonAKing/Gwitter"
            target="_blank"
            rel="noopener noreferrer"
          >
            📚 Gwitter Repository
          </a>
        </div>
      </footer>
    </div>
  );
}

// 主 App 组件，提供 AuthProvider
function App() {
  return (
    <AuthProvider clientId={config.request.clientID}>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
