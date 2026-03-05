import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UseRequireAuthReturn {
  isModalOpen: boolean;
  action: string;
  requireAuth: (action: string, callback?: () => void) => boolean;
  closeModal: () => void;
  onLoginSuccess: () => void;
}

export function useRequireAuth(): UseRequireAuthReturn {
  const { isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [action, setAction] = useState('执行此操作');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const requireAuth = useCallback((actionName: string, callback?: () => void): boolean => {
    if (isAuthenticated) {
      // 已登录，直接执行回调
      callback?.();
      return true;
    }

    // 未登录，显示登录弹窗
    setAction(actionName);
    setPendingCallback(() => callback || null);
    setIsModalOpen(true);
    return false;
  }, [isAuthenticated]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setPendingCallback(null);
  }, []);

  const onLoginSuccess = useCallback(() => {
    setIsModalOpen(false);
    // 登录成功后执行之前挂起的操作
    if (pendingCallback) {
      setTimeout(() => {
        pendingCallback();
        setPendingCallback(null);
      }, 100);
    }
  }, [pendingCallback]);

  return {
    isModalOpen,
    action,
    requireAuth,
    closeModal,
    onLoginSuccess,
  };
}
