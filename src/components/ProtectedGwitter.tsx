import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPrompt } from './LoginPrompt';
import './ProtectedGwitter.css';

interface ProtectedGwitterProps {
  children: React.ReactNode;
}

export const ProtectedGwitter: React.FC<ProtectedGwitterProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLoginPrompt, setShowLoginPrompt] = React.useState(false);

  useEffect(() => {
    if (!containerRef.current || isAuthenticated) return;

    const container = containerRef.current;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // 检查是否点击了评论输入框、点赞按钮或评论按钮
      const isCommentInput = target.closest('.comment-input, [class*="comment"], textarea');
      const isReactionButton = target.closest('.reaction-btn, [class*="reaction"], [class*="like"]');
      const isCommentButton = target.closest('.comment-btn, [class*="comment-button"]');
      
      if (isCommentInput || isReactionButton || isCommentButton) {
        e.preventDefault();
        e.stopPropagation();
        setShowLoginPrompt(true);
        return false;
      }
    };

    // 使用捕获阶段拦截点击事件
    container.addEventListener('click', handleClick, true);

    // 添加视觉提示
    const addLoginOverlay = () => {
      const gwitterContainer = container.querySelector('#gwitter-container');
      if (gwitterContainer && !gwitterContainer.querySelector('.login-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'login-overlay';
        overlay.innerHTML = `
          <div class="login-overlay-content">
            <span>🔒 登录后可互动</span>
          </div>
        `;
        overlay.style.cssText = `
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0.7));
          padding: 40px 20px 20px;
          text-align: center;
          pointer-events: none;
          z-index: 10;
        `;
        
        const content = overlay.querySelector('.login-overlay-content') as HTMLElement;
        if (content) {
          content.style.cssText = `
            color: #666;
            font-size: 14px;
            font-weight: 500;
          `;
        }
        
        (gwitterContainer as HTMLElement).style.position = 'relative';
        gwitterContainer.appendChild(overlay);
      }
    };

    // 延迟添加遮罩，确保 Gwitter 已渲染
    const timeoutId = setTimeout(addLoginOverlay, 1000);

    return () => {
      container.removeEventListener('click', handleClick, true);
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated]);

  // 当用户登录后，移除遮罩
  useEffect(() => {
    if (isAuthenticated && containerRef.current) {
      const overlay = containerRef.current.querySelector('.login-overlay');
      if (overlay) {
        overlay.remove();
      }
    }
  }, [isAuthenticated]);

  return (
    <div ref={containerRef} className="protected-gwitter-wrapper">
      {children}
      {showLoginPrompt && (
        <LoginPrompt />
      )}
      {showLoginPrompt && (
        <div 
          className="login-prompt-backdrop" 
          onClick={() => setShowLoginPrompt(false)}
        />
      )}
    </div>
  );
};
