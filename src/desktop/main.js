const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: '橱柜工厂管理系统',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 加载Web前端地址
  const isDev = !app.isPackaged;
  const webUrl = isDev ? 'http://localhost:5173' : 'https://factory.fne-cabinets.online';

  mainWindow.loadURL(webUrl);

  // 开发模式打开DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('橱柜工厂管理系统桌面端已启动');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 暴露版本信息给渲染进程
ipcMain.handle('get-app-version', () => app.getVersion());
