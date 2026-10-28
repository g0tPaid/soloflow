const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { isAllowedNavigation } = require('./allowed-url');

const START_URL = process.env.SOLOFLOW_URL || 'https://soloflow.practicalthings.store';

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

function showOffline() {
  if (!mainWindow) return;
  const retry = START_URL.replace(/"/g, '');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SoloFlow</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111; color: #fff; font-family: "Segoe UI", sans-serif; }
    main { max-width: 28rem; padding: 2rem; text-align: center; }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { color: #ccc; line-height: 1.5; }
    a { display: inline-block; margin-top: 1.25rem; background: #E40046; color: #fff; text-decoration: none; padding: 0.7rem 1.2rem; border-radius: 0.5rem; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <h1>SoloFlow is offline</h1>
    <p>This app opens your billing account. Check the network connection, then try again.</p>
    <a href="${retry}">Try again</a>
  </main>
</body>
</html>`;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'SoloFlow',
    autoHideMenuBar: true,
    backgroundColor: '#111111',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const contents = mainWindow.webContents;

  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url, START_URL)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, url) => {
    if (url.startsWith('data:text/html')) return;
    if (!isAllowedNavigation(url, START_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  contents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    showOffline();
  });

  mainWindow.loadURL(START_URL);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: 'File',
          submenu: [
            {
              label: 'Reload',
              accelerator: 'CmdOrCtrl+R',
              click: () => mainWindow?.webContents.reload(),
            },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'View',
          submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }],
        },
      ]),
    );
    createWindow();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
