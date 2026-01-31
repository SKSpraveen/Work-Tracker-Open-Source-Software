/**
 * Preload Script for TimeFlow Desktop Application
 * 
 * This script runs in a privileged context before the main renderer process loads.
 * It acts as a secure bridge between the renderer process (web content) and 
 * the main Electron process (Node.js backend).
 * 
 * IMPORTANT: This script is the ONLY way the renderer can safely communicate
 * with the main process due to Electron's security model.
 */

// Import necessary Electron modules
// contextBridge: Safely exposes APIs to the isolated renderer process
// ipcRenderer: Handles communication between renderer and main processes
const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a secure API to the renderer process (web page)
 * All functions exposed here will be available in the renderer as window.electronAPI
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== TIMER CONTROL ====================
  
  /**
   * Send timer state updates from the renderer to the main process
   * @param {Object} data - Timer state information (e.g., {isRunning: true, time: 12345})
   * Used when user starts/stops/pauses the work timer
   */
  sendTimerState: (data) => ipcRenderer.send('timer-state', data),
  
  // ==================== NOTIFICATION SYSTEM ====================
  
  /**
   * Request the main process to show a basic notification
   * @param {Object} data - Notification configuration (title, body, etc.)
   * Used for simple status updates like "Timer started"
   */
  showNotification: (data) => ipcRenderer.send('show-notification', data),
  
  /**
   * Request the main process to show a rich notification with styling
   * @param {Object} data - Rich notification configuration with icons/actions
   * Used for important alerts like idle warnings
   */
  showRichNotification: (data) => ipcRenderer.send('show-rich-notification', data),
  
  // ==================== ACTIVITY TRACKING ====================
  
  /**
   * Notify main process that user activity was detected in the app
   * Used to reset idle timer when user interacts with the app
   */
  sendUserActivity: () => ipcRenderer.send('user-activity'),
  
  // ==================== APPLICATION CONTROL ====================
  
  /**
   * Bring the main application window to front and focus it
   * Used when clicking notifications or system tray icon
   */
  bringToFront: () => ipcRenderer.send('bring-to-front'),
  
  /**
   * Minimize the application window to system tray
   * Used when user wants to hide the app but keep it running
   */
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  
  // ==================== MANUAL ACTIVITY RESET ====================
  
  /**
   * Request manual reset of activity/idle timers
   * Used when user wants to manually reset timers via menu or tray
   */
  resetActivity: () => ipcRenderer.send('manual-activity-reset'),
  
  // ==================== SYSTEM MONITORING APIS ====================
  
  /**
   * Get current system idle time in seconds
   * @returns {Promise<number>} - Idle time in seconds
   * Used to check how long the user has been away from computer
   */
  getSystemIdleTime: () => ipcRenderer.invoke('get-system-idle-time'),
  
  /**
   * Check if system is currently idle (no user input)
   * @param {number} threshold - Idle threshold in seconds
   * @returns {Promise<string>} - Idle state ('active', 'idle', 'locked', 'unknown')
   * Used to determine if user is actively working
   */
  getSystemIdleState: (threshold) => ipcRenderer.invoke('get-system-idle-state', threshold),
  
  /**
   * Check if the system is currently in sleep mode
   * @returns {Promise<boolean>} - True if system is sleeping
   * Used to pause timers when computer is asleep
   */
  isSystemSleeping: () => ipcRenderer.invoke('is-system-sleeping'),
  
  // ==================== PLATFORM INFORMATION ====================
  
  /**
   * Current operating system platform
   * Direct access (no IPC needed) - available at preload time
   * Possible values: 'win32', 'darwin' (macOS), 'linux'
   * Used for platform-specific UI adjustments
   */
  platform: process.platform,
  
  /**
   * Get the current application version
   * @returns {Promise<string>} - Version number string
   * Used for displaying version info and update checks
   */
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // ==================== EVENT LISTENERS FOR SYSTEM MONITORING ====================
  // These functions allow the renderer to subscribe to system events
  
  /**
   * Subscribe to system idle time updates
   * @param {Function} callback - Function to call with idle time data
   * Called every 10 seconds with current idle time
   */
  onSystemIdleUpdate: (callback) => {
    ipcRenderer.on('system-idle-update', (event, data) => callback(data));
  },
  
  /**
   * Subscribe to system idle warning events (10+ minutes idle)
   * @param {Function} callback - Function to call with warning data
   * Called when user has been idle for 10-15 minutes
   */
  onSystemIdleWarning: (callback) => {
    ipcRenderer.on('system-idle-warning', (event, data) => callback(data));
  },
  
  /**
   * Subscribe to system idle critical alerts (15+ minutes idle)
   * @param {Function} callback - Function to call with critical alert data
   * Called when user has been idle for 15+ minutes
   */
  onSystemIdleCritical: (callback) => {
    ipcRenderer.on('system-idle-critical', (event, data) => callback(data));
  },
  
  /**
   * Subscribe to system sleep events
   * @param {Function} callback - Function to call when system goes to sleep
   * Called when computer enters sleep mode (closing lid, etc.)
   */
  onSystemSleep: (callback) => {
    ipcRenderer.on('system-sleep', () => callback());
  },
  
  /**
   * Subscribe to system wake events
   * @param {Function} callback - Function to call when system wakes up
   * Called when computer wakes from sleep
   */
  onSystemWake: (callback) => {
    ipcRenderer.on('system-wake', () => callback());
  },
  
  /**
   * Subscribe to screen lock events
   * @param {Function} callback - Function to call when screen is locked
   * Called when user locks their computer (Win+L, Ctrl+Cmd+Q, etc.)
   */
  onScreenLocked: (callback) => {
    ipcRenderer.on('screen-locked', () => callback());
  },
  
  /**
   * Subscribe to screen unlock events
   * @param {Function} callback - Function to call when screen is unlocked
   * Called when user unlocks their computer
   */
  onScreenUnlocked: (callback) => {
    ipcRenderer.on('screen-unlocked', () => callback());
  },
  
  /**
   * Subscribe to window focus events
   * @param {Function} callback - Function to call when window gains focus
   * Called when user clicks on or brings the app window to front
   */
  onWindowFocused: (callback) => {
    ipcRenderer.on('window-focused', () => callback());
  },
  
  /**
   * Subscribe to window blur events
   * @param {Function} callback - Function to call when window loses focus
   * Called when user clicks away from the app window
   */
  onWindowBlurred: (callback) => {
    ipcRenderer.on('window-blurred', () => callback());
  },
  
  /**
   * Subscribe to activity reset confirmation
   * @param {Function} callback - Function to call when reset is confirmed
   * Called after manual activity reset request is processed
   */
  onActivityResetConfirmed: (callback) => {
    ipcRenderer.on('activity-reset-confirmed', () => callback());
  },
  
  /**
   * Subscribe to notification click events
   * @param {Function} callback - Function to call when notification is clicked
   * Called when user clicks on a system notification
   */
  onNotificationClicked: (callback) => {
    ipcRenderer.on('notification-clicked', (event, data) => callback(data));
  },
  
  /**
   * Subscribe to rich notification click events
   * @param {Function} callback - Function to call when rich notification is clicked
   * Similar to onNotificationClicked but for styled notifications
   */
  onRichNotificationClicked: (callback) => {
    ipcRenderer.on('rich-notification-clicked', (event, data) => callback(data));
  },
  
  /**
   * Subscribe to notification action events (macOS only)
   * @param {Function} callback - Function to call when notification button is clicked
   * Called when user clicks action buttons on macOS notifications
   */
  onNotificationAction: (callback) => {
    ipcRenderer.on('notification-action', (event, data) => callback(data));
  },
  
  // ==================== EVENT LISTENER REMOVAL ====================
  // These functions allow proper cleanup of event listeners
  
  /**
   * Remove system idle update listener
   * @param {Function} callback - The callback function to remove
   * Used during component cleanup to prevent memory leaks
   */
  removeSystemIdleUpdateListener: (callback) => {
    ipcRenderer.removeListener('system-idle-update', callback);
  },
  
  /**
   * Remove system idle warning listener
   * @param {Function} callback - The callback function to remove
   * Used during component cleanup to prevent memory leaks
   */
  removeSystemIdleWarningListener: (callback) => {
    ipcRenderer.removeListener('system-idle-warning', callback);
  },
  
  /**
   * Remove system idle critical listener
   * @param {Function} callback - The callback function to remove
   * Used during component cleanup to prevent memory leaks
   */
  removeSystemIdleCriticalListener: (callback) => {
    ipcRenderer.removeListener('system-idle-critical', callback);
  },
  
  /**
   * Remove notification action listener
   * @param {Function} callback - The callback function to remove
   * Used during component cleanup to prevent memory leaks
   */
  removeNotificationActionListener: (callback) => {
    ipcRenderer.removeListener('notification-action', callback);
  },
});