const { contextBridge, ipcRenderer } = require('electron');

const appUrlArg = (process.argv || []).find((a) => typeof a === 'string' && a.startsWith('--fursalink-app-url='));
const appUrl = appUrlArg ? appUrlArg.split('=')[1] : null;

contextBridge.exposeInMainWorld('FursaLink', {
  appUrl,
  onUpdateStatus: (cb) => {
    ipcRenderer.on('app:update-status', (_event, payload) => cb(payload));
    return () => ipcRenderer.removeAllListeners('app:update-status');
  },
});
