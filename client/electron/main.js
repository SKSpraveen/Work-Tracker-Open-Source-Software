/**
 * Main Electron Process - TimeFlow Desktop Application
 * Handles window creation, system tray, notifications, and activity monitoring
 */

// Import required Electron modules and Node.js libraries
import { app, BrowserWindow, ipcMain, powerMonitor, Menu, Tray, nativeImage, screen, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ==================== CONFIGURATION ====================
// Convert the current module URL to a file path for directory resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect if we're running in development mode by checking environment variables and command line arguments
const isDev = process.env.NODE_ENV === 'development' || 
  process.argv.some(arg => arg.includes('dev'));

// Log startup information for debugging purposes
console.log('🚀 TimeFlow starting...', {
  NODE_ENV: process.env.NODE_ENV,
  isDev,
  platform: process.platform,
  version: app.getVersion()
});

// ==================== GLOBAL VARIABLES ====================
// Main application window instance (null when window is closed)
let mainWindow = null;

// System tray icon instance
let tray = null;

// Flag to track if user is intentionally quitting the app (to prevent accidental closure)
let isQuitting = false;

// Flag to track if user is currently working (timer is running)
let isUserWorking = false;

// Interval reference for checking system idle time
let idleCheckInterval = null;

// Timestamp of the last idle notification to prevent spamming
let lastIdleNotificationTime = 0;

// ==================== ICON MANAGEMENT ====================

/**
 * Finds and returns the correct icon path based on platform and available files
 * @returns {string|null} Path to icon file or null if not found
 */
function getIconPath() {
  const platform = process.platform;
  console.log('Platform detected:', platform);
  
  // List of possible locations where the icon might be stored
  const possiblePaths = [
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../../public/icon.png'),
    path.join(__dirname, 'public/icon.png'),
    // Windows-specific icon formats
    ...(platform === 'win32' ? [
      path.join(__dirname, '../public/icon.ico'),
      path.join(__dirname, '../build/icon.ico'),
    ] : []),
    // macOS-specific icon formats
    ...(platform === 'darwin' ? [
      path.join(__dirname, '../public/icon.icns'),
      path.join(__dirname, '../build/icon.icns'),
    ] : []),
    // Fallback paths
    path.join(__dirname, '../public/icon.png'),
    path.join(process.cwd(), 'public/icon.png'),
    path.join(process.resourcesPath, 'public/icon.png'),
  ];

  // Try each path until we find an existing icon file
  for (const iconPath of possiblePaths) {
    try {
      if (fs.existsSync(iconPath)) {
        console.log('✅ Icon found at:', iconPath);
        return iconPath;
      } else {
        console.log('❌ Icon not found at:', iconPath);
      }
    } catch (error) {
      console.log('Error checking icon path:', iconPath, error.message);
    }
  }

  console.warn('⚠️ No icon found in any path');
  return null;
}

/**
 * Creates a native image icon for the application
 * @returns {NativeImage} Electron NativeImage object
 */
function createAppIcon() {
  const iconPath = getIconPath();
  
  if (iconPath) {
    try {
      // Create icon from the found path
      const icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        console.warn('Icon created but empty');
        return createDefaultIcon();
      }
      return icon;
    } catch (error) {
      console.error('Error creating icon:', error.message);
      return createDefaultIcon();
    }
  }
  
  // Fallback to default icon if no icon file is found
  return createDefaultIcon();
}

/**
 * Creates a minimal default icon as fallback when no icon file is available
 * @returns {NativeImage} Empty NativeImage object
 */
function createDefaultIcon() {
  console.log('Creating default fallback icon');
  // Return empty image as placeholder
  return nativeImage.createEmpty();
}

// ==================== SYSTEM ACTIVITY MONITORING ====================

/**
 * Starts monitoring system-wide idle time to track when the user is away from computer
 * Sends updates to renderer process and triggers notifications based on idle duration
 */
function startSystemIdleMonitoring() {
  // Clear any existing interval to prevent duplicates
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
  }

  console.log('🖥️ Starting system-wide idle monitoring...');
  
  // Check idle time every 10 seconds
  idleCheckInterval = setInterval(() => {
    try {
      // Get system idle time in seconds from powerMonitor API
      const idleTime = powerMonitor.getSystemIdleTime();
      const idleMinutes = idleTime / 60;
      
      // Log idle time for debugging (every minute after 5 minutes of idle)
      if (idleTime > 300 && idleTime % 60 === 0) {
        console.log(`[SYSTEM IDLE] System idle for: ${Math.floor(idleTime)}s (${idleMinutes.toFixed(1)}min)`);
      }
      
      // Send idle time update to the renderer process for UI display
      if (mainWindow) {
        mainWindow.webContents.send('system-idle-update', { 
          idleTime, 
          idleMinutes,
          timestamp: Date.now()
        });
      }
      
      // Send warning notification when idle for 10-15 minutes
      if (idleMinutes >= 10 && idleMinutes < 15) {
        const now = Date.now();
        // Throttle notifications to avoid spamming (max once every 5 minutes)
        if (now - lastIdleNotificationTime > 5 * 60 * 1000) {
          console.log(`[SYSTEM IDLE] 10-minute warning: ${idleMinutes.toFixed(1)} minutes idle`);
          
          if (mainWindow) {
            mainWindow.webContents.send('system-idle-warning', {
              idleTime,
              idleMinutes,
              type: 'warning'
            });
          }
          lastIdleNotificationTime = now;
        }
      }
      
      // Send critical alert when idle for 15+ minutes
      if (idleMinutes >= 15) {
        const now = Date.now();
        // Throttle critical alerts (max once every 2 minutes)
        if (now - lastIdleNotificationTime > 2 * 60 * 1000) {
          console.log(`[SYSTEM IDLE] CRITICAL: ${idleMinutes.toFixed(1)} minutes idle`);
          
          if (mainWindow) {
            mainWindow.webContents.send('system-idle-critical', {
              idleTime,
              idleMinutes,
              type: 'critical'
            });
          }
          lastIdleNotificationTime = now;
        }
      }
    } catch (error) {
      console.error('Error checking system idle time:', error);
    }
  }, 10000); // Check every 10 seconds
}

/**
 * Stops the system idle monitoring by clearing the interval
 */
function stopSystemIdleMonitoring() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
    console.log('🛑 Stopped system idle monitoring');
  }
}

// ==================== WINDOW CREATION ====================

/**
 * Creates and configures the main application window
 */
function createWindow() {
  console.log('Creating main window...');
  
  // Get screen dimensions to size window appropriately
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Create app icon for window and system
  const appIcon = createAppIcon();
  
  // Window configuration with responsive sizing
  const windowConfig = {
    width: Math.min(1200, width - 100),
    height: Math.min(800, height - 100),
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false, // Security: don't allow Node in renderer
      contextIsolation: true, // Security: isolate preload script
      enableRemoteModule: false, // Security: disable remote module
      preload: path.join(__dirname, 'preload.js'), // Preload script for safe IPC
      webSecurity: true,
      sandbox: false
    },
    frame: true, // Keep native window frame
    show: true,
    backgroundColor: '#0f172a', // Dark theme background
    titleBarStyle: 'default',
    autoHideMenuBar: false,
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: true,
    title: 'TimeFlow - Employee Time Tracking'
  };

  // Set window icon if available
  if (appIcon && !appIcon.isEmpty()) {
    windowConfig.icon = appIcon;
  }

  // Create the main BrowserWindow instance
  mainWindow = new BrowserWindow(windowConfig);

  // macOS specific: Set dock icon
  if (process.platform === 'darwin' && appIcon && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon);
  }

  // Windows specific: Set taskbar icon and app ID
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.timeflow.app');
    if (appIcon && !appIcon.isEmpty()) {
      mainWindow.setIcon(appIcon);
    }
  }

  // Create the application menu
  createApplicationMenu();

  // Load the application content
  loadApplication();

  // Set up window event handlers
  setupWindowEvents();

  // Create system tray icon
  createSystemTray();

  // Set up IPC (Inter-Process Communication) handlers
  setupIPC();

  // Start idle monitoring after window is fully loaded
  mainWindow.once('ready-to-show', () => {
    // Small delay to ensure everything is loaded before starting monitoring
    setTimeout(() => {
      startSystemIdleMonitoring();
    }, 2000);
  });
}

/**
 * Creates the application menu with File, Edit, View, and Window options
 */
function createApplicationMenu() {
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open DevTools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.openDevTools()
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload()
        },
        { type: 'separator' },
        {
          label: 'Reset Activity Timer',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) {
              // Send reset command to renderer process
              mainWindow.webContents.send('manual-activity-reset');
              // Show confirmation notification
              showRichNotification({
                title: '🔄 Activity Timer Reset',
                body: 'Activity timer has been manually reset',
                urgency: 'normal'
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { 
          label: 'Bring to Front', 
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        }
      ]
    }
  ];

  // Build and set the application menu
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

/**
 * Loads the application content from either dev server or production build
 */
function loadApplication() {
  // Determine URL based on environment
  const startUrl = isDev 
    ? 'http://localhost:5173' // Development server
    : `file://${path.join(__dirname, '../dist/index.html')}`; // Production build

  console.log(`Loading URL: ${startUrl}`);

  let retryCount = 0;
  const maxRetries = 3;

  /**
   * Attempts to load the URL with retry logic
   */
  function load() {
    mainWindow.loadURL(startUrl)
      .then(() => {
        console.log('✅ Successfully loaded app');
      })
      .catch(error => {
        console.error('❌ Failed to load:', error.message);
        retryCount++;
        
        // Retry loading up to maxRetries times
        if (retryCount < maxRetries) {
          console.log(`Retrying... (${retryCount}/${maxRetries})`);
          setTimeout(load, 1000);
        } else {
          // Show error page if all retries fail
          showErrorPage(error);
        }
      });
  }

  // Start loading
  load();
}

/**
 * Displays an error page when the app fails to load
 * @param {Error} error - The error that occurred
 */
function showErrorPage(error) {
  const errorHtml = `
    <html>
      <head>
        <title>TimeFlow - Error</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            background: #0f172a; 
            color: white; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0;
          }
          .error-container { 
            text-align: center; 
            padding: 40px;
            background: #1e293b;
            border-radius: 10px;
            border: 1px solid #334155;
            max-width: 600px;
          }
          h1 { color: #f87171; margin-bottom: 20px; }
          .error-details { 
            background: #1e293b; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
            text-align: left;
            font-family: monospace;
            font-size: 12px;
            overflow: auto;
            max-height: 200px;
          }
          button { 
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer;
            margin: 5px;
            font-size: 14px;
          }
          button:hover { background: #2563eb; }
          .button-group { margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>⚠️ Failed to Load TimeFlow</h1>
          <p>The application could not be loaded. Please check:</p>
          <ul style="text-align: left; margin: 20px 0;">
            <li>Is the development server running? (for development)</li>
            <li>Have you built the application? (for production)</li>
          </ul>
          <div class="error-details">
            Error: ${error.message}<br>
            URL: ${isDev ? 'http://localhost:5173' : 'dist/index.html'}
          </div>
          <div class="button-group">
            <button onclick="location.reload()">Retry Loading</button>
            <button onclick="window.close()">Close Application</button>
          </div>
        </div>
      </body>
    </html>
  `;

  // Load error HTML directly into the window
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

/**
 * Sets up event handlers for the main window
 */
function setupWindowEvents() {
  // Window focus event: send to renderer when window gains focus
  mainWindow.on('focus', () => {
    console.log('🎯 Window focused');
    mainWindow?.webContents.send('window-focused');
  });

  // Window blur event: send to renderer when window loses focus
  mainWindow.on('blur', () => {
    console.log('📝 Window blurred');
    mainWindow?.webContents.send('window-blurred');
  });

  // Window ready event: show window when content is loaded
  mainWindow.once('ready-to-show', () => {
    console.log('🪟 Window ready to show');
    mainWindow.show();
    mainWindow.focus();
  });

  // Window close event: minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      console.log('App minimized to tray');
      
      // Show notification that app is still running in tray
      if (Notification.isSupported()) {
        showRichNotification({
          title: '⏸️ TimeFlow',
          body: 'App is running in system tray\nClick tray icon to restore',
          urgency: 'normal',
          timeout: 5000
        });
      }
    }
  });

  // Window closed event: clean up resources
  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
    stopSystemIdleMonitoring();
  });

  // Log console messages from renderer process
  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`Renderer [${level}]: ${message}`);
  });
}

// ==================== ENHANCED NOTIFICATION FUNCTIONS ====================

/**
 * Shows a rich notification with app logo and custom styling
 * @param {Object} data - Notification configuration
 * @param {string} data.title - Notification title
 * @param {string} data.body - Notification body text
 * @param {string} [data.urgency='normal'] - Notification urgency level
 * @param {boolean} [data.silent=false] - Whether notification should be silent
 * @param {number} [data.timeout] - Auto-dismiss timeout in milliseconds
 * @returns {Notification|null} Created notification object or null
 */
function showRichNotification(data) {
  if (!Notification.isSupported()) {
    console.warn('Notifications not supported on this platform');
    return;
  }

  const appIcon = createAppIcon();
  
  // Configure notification options
  const notificationOptions = {
    title: data.title || 'TimeFlow',
    body: data.body || '',
    icon: appIcon && !appIcon.isEmpty() ? appIcon : undefined,
    silent: data.silent || false,
    urgency: data.urgency || 'normal',
    timeoutType: 'never'
  };

  // macOS-specific notification options
  if (process.platform === 'darwin' && data.subtitle) {
    notificationOptions.subtitle = data.subtitle;
  }

  // macOS action buttons
  if (process.platform === 'darwin' && data.actions && Array.isArray(data.actions)) {
    notificationOptions.actions = data.actions;
  }

  // Create and configure the notification
  const notification = new Notification(notificationOptions);
  
  // Handle notification click: bring app to front
  notification.on('click', () => {
    console.log('Rich notification clicked:', data.title);
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('rich-notification-clicked', data);
    }
  });

  // Log when notification is closed
  notification.on('close', () => {
    console.log('Rich notification closed:', data.title);
  });

  // Log when notification is shown
  notification.on('show', () => {
    console.log('Rich notification shown:', data.title);
  });

  // Handle action button clicks (macOS only)
  if (process.platform === 'darwin' && data.actions) {
    notification.on('action', (event, index) => {
      console.log('Notification action clicked:', data.actions[index]);
      if (mainWindow) {
        mainWindow.webContents.send('notification-action', {
          action: data.actions[index],
          notificationData: data
        });
      }
    });
  }

  // Show the notification
  notification.show();

  // Auto-dismiss non-critical notifications after timeout
  if (data.timeout && data.timeout > 0 && data.urgency !== 'critical') {
    setTimeout(() => {
      try {
        notification.close();
      } catch (error) {
        console.log('Error closing notification:', error.message);
      }
    }, data.timeout);
  }

  return notification;
}

// ==================== SYSTEM TRAY ====================

/**
 * Creates and configures the system tray icon and menu
 */
function createSystemTray() {
  try {
    const appIcon = createAppIcon();
    
    // Don't create tray if no icon is available
    if (appIcon.isEmpty()) {
      console.warn('Cannot create tray - icon is empty');
      return;
    }

    // Resize icon for tray (smaller size)
    const trayIcon = appIcon.resize({ width: 16, height: 16 });
    
    // Create tray icon
    tray = new Tray(trayIcon);
    
    // Build tray context menu with app controls
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: '🚀 Show TimeFlow', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { 
        label: '🔄 Reset Activity Timer', 
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('manual-activity-reset');
            showRichNotification({
              title: '🔄 Activity Timer Reset',
              body: 'Activity timer has been manually reset',
              urgency: 'normal'
            });
          }
        }
      },
      { type: 'separator' },
      { 
        label: '📊 Dashboard', 
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('navigate-to', '/dashboard');
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      { 
        label: '▶️ Start Timer', 
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('timer-control', 'start');
          }
        }
      },
      { 
        label: '⏹️ Stop Timer', 
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('timer-control', 'stop');
          }
        }
      },
      { type: 'separator' },
      { 
        label: '📋 View System Idle Time', 
        click: async () => {
          if (mainWindow) {
            const idleTime = powerMonitor.getSystemIdleTime();
            const minutes = Math.floor(idleTime / 60);
            const seconds = Math.floor(idleTime % 60);
            
            // Show current idle time in notification
            showRichNotification({
              title: '💤 System Idle Time',
              body: `System has been idle for ${minutes}m ${seconds}s`,
              urgency: minutes > 10 ? 'critical' : 'normal',
              timeout: 5000
            });
          }
        }
      },
      { type: 'separator' },
      { 
        label: '🚪 Quit TimeFlow', 
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    // Set tooltip that appears when hovering over tray icon
    tray.setToolTip('TimeFlow - Time Tracking 🕒');
    tray.setContextMenu(contextMenu);
    
    // Tray click handler: toggle window visibility
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
    
    console.log('✅ System tray created successfully');
  } catch (error) {
    console.error('❌ Failed to create system tray:', error.message);
  }
}

// ==================== IPC HANDLERS ====================

/**
 * Sets up all IPC (Inter-Process Communication) handlers
 * These allow communication between the main process and renderer process
 */
function setupIPC() {
  // Timer control: receives timer state updates from renderer
  ipcMain.on('timer-state', (event, data) => {
    console.log('Timer state:', data);
    isUserWorking = data.isRunning;
  });

  // Enhanced notifications: receives notification requests from renderer
  ipcMain.on('show-notification', (event, data) => {
    console.log('Show enhanced notification:', data);
    showRichNotification(data);
  });

  // Rich notifications: receives rich notification requests from renderer
  ipcMain.on('show-rich-notification', (event, data) => {
    console.log('Show rich notification:', data);
    showRichNotification(data);
  });

  // Activity tracking: receives user activity signals from renderer
  ipcMain.on('user-activity', () => {
    console.log('User activity detected in app');
  });

  // Manual activity reset: receives reset requests from renderer
  ipcMain.on('manual-activity-reset', () => {
    console.log('Manual activity reset requested');
    // Confirm reset to renderer
    if (mainWindow) {
      mainWindow.webContents.send('activity-reset-confirmed');
    }
  });

  // Get system idle time: handler for renderer to request current idle time
  ipcMain.handle('get-system-idle-time', () => {
    return powerMonitor.getSystemIdleTime();
  });

  // Get system idle state: handler for renderer to request idle state
  ipcMain.handle('get-system-idle-state', (event, idleThreshold) => {
    return powerMonitor.getSystemIdleState(idleThreshold || 60);
  });

  // Check if system is sleeping: handler for renderer to check sleep state
  ipcMain.handle('is-system-sleeping', () => {
    return powerMonitor.isSystemInSleepMode();
  });

  // App control: bring main window to front
  ipcMain.on('bring-to-front', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // App control: minimize window to tray
  ipcMain.on('minimize-to-tray', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  // Platform info: returns current platform (win32, darwin, linux)
  ipcMain.handle('get-platform', () => {
    return process.platform;
  });

  // App version: returns current app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });
}

// ==================== APP LIFECYCLE ====================

// When Electron app is ready, initialize the application
app.whenReady().then(() => {
  console.log('🟢 App is ready');
  
  // macOS: Request notification permissions
  if (process.platform === 'darwin') {
    Notification.requestPermission();
  }
  
  // Create the main application window
  createWindow();
  
  // Handle macOS activate event (clicking dock icon)
  app.on('activate', () => {
    // Create new window if none exist
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      // Bring existing window to front
      mainWindow.show();
      mainWindow.focus();
      startSystemIdleMonitoring();
    }
  });
});

// Handle window-all-closed event (all windows closed)
app.on('window-all-closed', () => {
  console.log('All windows closed');
  stopSystemIdleMonitoring();
  // On macOS, keep app running when windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle before-quit event (clean up before quitting)
app.on('before-quit', () => {
  console.log('App is quitting');
  isQuitting = true;
  stopSystemIdleMonitoring();
});

// Handle quit event (app is about to terminate)
app.on('quit', () => {
  console.log('App quit');
});

// ==================== POWER MONITOR EVENTS ====================
// These events track system power state changes

// System going to sleep/suspend mode
powerMonitor.on('suspend', () => {
  console.log('[POWER] System is going to sleep');
  if (mainWindow) {
    mainWindow.webContents.send('system-sleep');
  }
});

// System waking up from sleep
powerMonitor.on('resume', () => {
  console.log('[POWER] System woke up from sleep');
  if (mainWindow) {
    mainWindow.webContents.send('system-wake');
  }
});

// Screen locked
powerMonitor.on('lock-screen', () => {
  console.log('[POWER] Screen locked');
  if (mainWindow) {
    mainWindow.webContents.send('screen-locked');
  }
});

// Screen unlocked
powerMonitor.on('unlock-screen', () => {
  console.log('[POWER] Screen unlocked');
  if (mainWindow) {
    mainWindow.webContents.send('screen-unlocked');
  }
});

// ==================== ERROR HANDLING ====================
// Global error handlers to catch unhandled exceptions and promise rejections

// Catch any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Catch any unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});