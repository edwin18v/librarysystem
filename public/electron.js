const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'favicon.ico') // In prod this is relative to build/ which has favicon
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        // In production, resources/app/build/electron.js is executed.
        // We need to load index.html from the same directory (build).
        // mainWindow.loadFile('index.html'); // This works if CWD is correct or relative.

        // Safer:
        mainWindow.loadURL(`file://${path.join(__dirname, 'index.html')}`);
    }
}

function startServer() {
    // In dev: public/electron.js -> ../server.js
    // In prod: build/electron.js -> ../server.js (because server.js is in root of app.asar, build is a subdir)
    // server.js is at: resources/app.asar/server.js
    // electron.js is at: resources/app.asar/build/electron.js
    const serverPath = path.join(__dirname, '../server.js');
    process.env.USER_DATA_PATH = app.getPath('userData');

    try {
        console.log("Starting server internally from:", serverPath);
        require(serverPath);
    } catch (e) {
        console.error("Failed to start server", e);
    }
}

app.on('ready', () => {
    startServer();
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});
