import { useEffect, useCallback, useState } from 'react';

export const useElectron = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [platform, setPlatform] = useState(null);

  // Check if running in Electron
  useEffect(() => {
    const checkElectron = () => {
      const hasElectronAPI = !!window.electronAPI;
      setIsElectron(hasElectronAPI);
      
      if (hasElectronAPI) {
        console.log('Running in Electron environment');
        setPlatform(window.electronAPI.platform || 'unknown');
        
        // Set up global error handler for Electron
        window.addEventListener('error', (event) => {
          console.error('Electron App Error:', event.error);
        });
      }
    };
    
    checkElectron();
  }, []);

  // Send timer state to Electron
  const sendTimerState = useCallback((isRunning, additionalData = {}) => {
    if (window.electronAPI) {
      window.electronAPI.sendTimerState({
        isRunning,
        timestamp: Date.now(),
        ...additionalData
      });
    }
  }, []);

  // Send user activity to Electron
  const sendUserActivity = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.sendUserActivity();
    }
  }, []);

  // Show system notification
  const showNotification = useCallback((title, body) => {
    if (window.electronAPI) {
      window.electronAPI.showNotification({ title, body });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      // Fallback to browser notifications
      new Notification(title, { body });
    }
  }, []);

  // Navigate within Electron app
  const navigateTo = useCallback((route) => {
    if (window.electronAPI) {
      window.electronAPI.navigateTo(route);
    }
  }, []);

  // Set up Electron event listeners
  const setupElectronListeners = useCallback((callbacks) => {
    if (!window.electronAPI) return () => {};

    const { onInactivity, onRestartTimer, onNavigate, onSystemActivity } = callbacks;

    if (onInactivity) {
      window.electronAPI.onInactivityDetected(onInactivity);
    }

    if (onRestartTimer) {
      window.electronAPI.onRestartTimer(onRestartTimer);
    }

    if (onNavigate) {
      window.electronAPI.onNavigateTo(onNavigate);
    }

    if (onSystemActivity) {
      window.electronAPI.onSystemActivity(onSystemActivity);
    }

    // Cleanup function
    return () => {
      if (onInactivity) {
        window.electronAPI.removeInactivityListener();
      }
      if (onRestartTimer) {
        window.electronAPI.removeRestartTimerListener();
      }
      if (onNavigate) {
        window.electronAPI.removeNavigateToListener();
      }
      if (onSystemActivity) {
        window.electronAPI.removeSystemActivityListener();
      }
    };
  }, []);

  return {
    isElectron,
    platform,
    sendTimerState,
    sendUserActivity,
    showNotification,
    navigateTo,
    setupElectronListeners
  };
};