import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import * as os from 'os';

let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;
const PORT = 3000; // Electron内部端口

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: '项目管理系统'
  });

  // 加载应用
  if (isDev) {
    // 开发环境：直接连接Next.js开发服务器
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：连接打包后的应用
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  // 阻止新窗口打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 在默认浏览器中打开外部链接
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 启动Next.js服务器
function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const nextStartScript = path.join(__dirname, '../start-next.js');

    // 使用自定义启动脚本
    serverProcess = spawn('node', [nextStartScript], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        PORT: PORT.toString(),
        NODE_ENV: 'production'
      },
      stdio: 'inherit'
    });

    serverProcess.on('error', (err: Error) => {
      console.error('Failed to start Next.js server:', err);
      reject(err);
    });

    serverProcess.on('exit', (code: number) => {
      if (code !== 0) {
        console.error(`Next.js server exited with code ${code}`);
        reject(new Error(`Next.js server exited with code ${code}`));
      }
    });

    // 等待服务器启动
    setTimeout(() => {
      console.log(`Next.js server should be running on port ${PORT}`);
      resolve();
    }, 5000);
  });
}

// 预加载脚本
// const preloadScript = `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (defaultPath, content) => ipcRenderer.invoke('save-file', defaultPath, content),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info')
});
`;

// IPC处理器
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('get-app-path', () => app.getAppPath());
ipcMain.handle('get-system-info', () => ({
  platform: os.platform(),
  arch: os.arch(),
  release: os.release(),
  hostname: os.hostname()
}));

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile']
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('save-file', async (event, defaultPath: string, content: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath
  });
  if (result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return result.filePath;
  }
  return null;
});

ipcMain.handle('show-message-box', async (event, options: any) => {
  const result = await dialog.showMessageBox(options);
  return result;
});

// 应用事件
app.whenReady().then(async () => {
  // 生产环境启动Next.js服务器
  if (!isDev) {
    try {
      await startNextServer();
    } catch (error) {
      console.error('Failed to start Next.js server:', error);
      dialog.showErrorBox(
        '启动错误',
        '无法启动Next.js服务器。请确保所有依赖已正确安装。'
      );
      app.quit();
      return;
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 停止服务器
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // 清理
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
