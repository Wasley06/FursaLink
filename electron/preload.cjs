const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('FursaLink', {
  onUpdateStatus: (cb) => {
    ipcRenderer.on('app:update-status', (_event, payload) => cb(payload));
    return () => ipcRenderer.removeAllListeners('app:update-status');
  },
});

