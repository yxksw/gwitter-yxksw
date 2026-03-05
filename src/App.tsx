import gwitter from 'gwitter';
import 'gwitter/dist/gwitter.min.css';
import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { GwitterConfig, config } from './config/gwitter.config';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthButton } from './components/AuthButton';
import { LoginRequiredModal } from './components/LoginRequiredModal';
import { useRequireAuth } from './hooks/useRequireAuth';

// 包装组件，使用认证上下文
function AppContent() {
  const [currentConfig, setCurrentConfig] = useState<GwitterConfig>(config);
  const { token, isAuthenticated, user } = useAuth();
  const { isModalOpen, action, requireAuth, closeModal, onLoginSuccess } = useRequireAuth();

  // 更新配置，添加用户 token
  useEffect(() => {
    setCurrentConfig(prev => ({
      ...prev,
      request: {
        ...prev.request,
        // 如果用户已登录，使用用户的 token，否则使用配置的 token
        token: token || prev.request.token,
      },
    }));
  }, [token]);

  // 拦截 Gwitter 的交互操作
  useEffect(() => {
    // 监听点赞按钮点击
    const handleLikeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const likeButton = target.closest('.gweet-reaction');
      if (likeButton && !isAuthenticated) {
        e.preventDefault();
        e.stopPropagation();
        requireAuth('点赞');
        return false;
      }
    };

    // 监听评论按钮点击
    const handleCommentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const commentButton = target.closest('.gweet-comment-btn');
      if (commentButton && !isAuthenticated) {
        e.preventDefault();
        e.stopPropagation();
        requireAuth('评论');
        return false;
      }
    };

    // 监听回复按钮点击
    const handleReplyClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const replyButton = target.closest('.comment-reply-btn');
      if (replyButton && !isAuthenticated) {
        e.preventDefault();
        e.stopPropagation();
        requireAuth('回复评论');
        return false;
      }
    };

    const container = document.getElementById('gwitter-container');
    if (container) {
      container.addEventListener('click', handleLikeClick, true);
      container.addEventListener('click', handleCommentClick, true);
      container.addEventListener('click', handleReplyClick, true);
    }

    return () => {
      if (container) {
        container.removeEventListener('click', handleLikeClick, true);
        container.removeEventListener('click', handleCommentClick, true);
        container.removeEventListener('click', handleReplyClick, true);
      }
    };
  }, [isAuthenticated, requireAuth]);

  // 处理 GitHub OAuth 回调
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && window.opener) {
      // 这是 OAuth 回调窗口，发送消息给父窗口
      window.opener.postMessage(
        JSON.stringify({ result: 'access_token=' + code, error: null }),
        '*'
      );
      // 显示成功消息
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><h2>✅ 授权成功，正在关闭窗口...</h2></div>';
      // 关闭窗口
      setTimeout(() => window.close(), 1500);
    }
  }, []);

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
          <div className="auth-section">
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="App-main">
        <div className="demo-info">
          <h2>📋 当前配置</h2>
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
              <strong>登录状态:</strong>{' '}
              {isAuthenticated ? (
                <span className="auth-status logged-in">已登录 ({user?.login})</span>
              ) : (
                <span className="auth-status logged-out">未登录</span>
              )}
            </div>
          </div>
          {!isAuthenticated && (
            <div className="login-notice">
              <p>💡 <strong>提示：</strong>登录后可以评论、点赞和参与互动</p>
            </div>
          )}
        </div>

        <div id="gwitter-container" className="gwitter-demo-container"></div>
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

      {/* 登录提示弹窗 */}
      <LoginRequiredModal
        isOpen={isModalOpen}
        onClose={closeModal}
        action={action}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
