/**
 * Auto-Update Module for Electron
 * Handles checking and installing app updates from GitHub releases
 */

import { autoUpdater } from 'electron-updater';
import { ipcMain, Notification } from 'electron';

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

// Handle update events
export function setupUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    new Notification({
      title: 'TimeFlow Update Available',
      body: `Version ${info.version} is available. It will be downloaded in the background.`,
    }).show();
  });

  autoUpdater.on('update-not-available', () => {
    console.log('App is up to date');
  });

  autoUpdater.on('error', (error) => {
    console.error('Update error:', error);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const log_message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
    console.log(log_message);
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded, will install on quit');
    new Notification({
      title: 'TimeFlow Update Ready',
      body: 'Update has been downloaded. It will be installed when you restart the app.',
    }).show();
  });

  // Listen for manual update check from renderer
  ipcMain.handle('check-for-updates', async () => {
    const result = await autoUpdater.checkForUpdates();
    return result;
  });

  // Handle update installation
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });
}

export default setupUpdater;
