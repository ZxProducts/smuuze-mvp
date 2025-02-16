'use client';

import { useEffect, useState } from 'react';
import { useToastMessage } from './useToastMessage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { showSuccess, showError } = useToastMessage();

  useEffect(() => {
    // Service Workerの登録
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('SW registered:', registration);
        } catch (error) {
          console.error('SW registration failed:', error);
        }
      }
    };

    registerServiceWorker();

    // インストールプロンプトのイベントリスナー
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // インストール完了イベントのリスナー
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setInstallPrompt(null);
      showSuccess('アプリケーションがインストールされました');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptToInstall = async () => {
    if (!installPrompt) {
      return;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsInstallable(false);
      }
    } catch (error) {
      showError('インストールに失敗しました');
      console.error('Installation failed:', error);
    }
  };

  return {
    isInstallable,
    promptToInstall,
  };
}

// オフライン状態の監視フック
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}