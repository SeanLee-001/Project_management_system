import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (defaultPath: string, content: string) =>
    ipcRenderer.invoke('save-file', defaultPath, content),
  showMessageBox: (options: Electron.MessageBoxOptions) =>
    ipcRenderer.invoke('show-message-box', options),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
});
