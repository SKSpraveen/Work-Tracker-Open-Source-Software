import { powerMonitor, screen } from 'electron';

let lastActivityTime = Date.now();
let checkInterval = null;

export const systemActivityMonitor = {
  start: (mainWindow) => {
    console.log('Starting system monitor');
    
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.error('Main window is not available for system monitor');
      return { stop: () => {} };
    }
    
    // Track when system resumes from sleep/lock
    powerMonitor.on('resume', () => {
      console.log('System resumed from sleep');
      lastActivityTime = Date.now();
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('system-activity', {
          type: 'resume',
          timestamp: Date.now()
        });
      }
    });
    
    // Track when system goes to sleep/lock
    powerMonitor.on('suspend', () => {
      console.log('System going to sleep');
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('system-activity', {
          type: 'suspend',
          timestamp: Date.now()
        });
      }
    });
    
    // Monitor mouse position (fallback)
    checkInterval = setInterval(() => {
      try {
        // Get cursor position
        const point = screen.getCursorScreenPoint();
        lastActivityTime = Date.now();
        
        // Send heartbeat to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('system-activity', {
            type: 'heartbeat',
            timestamp: Date.now(),
            mousePosition: point
          });
        }
      } catch (error) {
        console.error('Error in system monitor:', error);
      }
    }, 30000); // Check every 30 seconds
    
    return {
      stop: () => {
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
        powerMonitor.removeAllListeners();
      }
    };
  },
  
  getLastActivityTime: () => lastActivityTime
};