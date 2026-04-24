/* eslint-disable @typescript-eslint/no-var-requires */
const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 720,
    backgroundColor: '#EAF4FB',
    show: false,
    title: 'FursaLink Zanzibar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    try {
      const current = new URL(win.webContents.getURL());
      const next = new URL(url);
      if (current.origin !== next.origin) {
        e.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      // ignore
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexHtml);
  }

  return win;
}

function setupAutoUpdates(win) {
  if (isDev) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    // Avoid noisy dialogs on transient network errors
    console.error('autoUpdater error', err);
  });

  autoUpdater.on('update-available', () => {
    win?.webContents.send('app:update-status', { status: 'available' });
  });

  autoUpdater.on('update-not-available', () => {
    win?.webContents.send('app:update-status', { status: 'none' });
  });

  autoUpdater.on('update-downloaded', async () => {
    win?.webContents.send('app:update-status', { status: 'downloaded' });

    const res = await dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update Ready',
      message: 'A new version has been downloaded.',
      detail: 'Restart the app to apply the update.',
    });

    if (res.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  // Initial check + periodic checks
  autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 1000 * 60 * 30);
}

app.whenReady().then(() => {
  const win = createWindow();
  setupAutoUpdates(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow();
      setupAutoUpdates(newWin);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
