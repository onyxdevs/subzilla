import 'module-alias/register';

import { app, BrowserWindow, shell } from 'electron';
import path from 'path';

import { setupIPC } from './ipc';
import { createMenu } from './menu';
import { AutoUpdater } from './updater';

const isDev = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

class SubzillaApp {
    private mainWindow: BrowserWindow | null = null;
    private preferencesWindow: BrowserWindow | null = null;
    private autoUpdater: AutoUpdater | null = null;

    constructor() {
        console.log('🦎 Initializing Subzilla Mac App...');
        this.setupApp();
    }

    private setupApp(): void {
        // Handle app ready
        app.whenReady().then(() => {
            console.log('🚀 App ready, creating main window...');
            this.createMainWindow();
            this.setupMenu();
            this.setupIPC();
            this.setupAutoUpdater();

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createMainWindow();
                }
            });
        });

        // Quit when all windows are closed (except on macOS)
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // Handle file opening from Finder/Dock
        app.on('open-file', (event, filePath) => {
            event.preventDefault();
            console.log(`📂 File opened from system: ${filePath}`);
            if (this.mainWindow) {
                this.mainWindow.webContents.send('file-opened', filePath);
                this.mainWindow.show();
                this.mainWindow.focus();
            }
        });

        // Security: prevent new window creation
        app.on('web-contents-created', (_, contents) => {
            contents.on('new-window', (event, navigationUrl) => {
                event.preventDefault();
                shell.openExternal(navigationUrl);
            });
        });
    }

    private createMainWindow(): void {
        console.log('🖼️ Creating main window...');
        
        this.mainWindow = new BrowserWindow({
            width: 500,
            height: 400,
            minWidth: 400,
            minHeight: 300,
            titleBarStyle: 'hiddenInset',
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, '../preload/index.js'),
                webSecurity: true,
                allowRunningInsecureContent: false
            },
            icon: path.join(__dirname, '../../assets/icon.icns')
        });

        // Load the main window content
        const indexPath = path.join(__dirname, '../renderer/index.html');
        this.mainWindow.loadFile(indexPath);

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            console.log('✅ Main window ready, showing...');
            this.mainWindow?.show();
            
            if (isDev) {
                this.mainWindow?.webContents.openDevTools();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });
    }

    public createPreferencesWindow(): void {
        if (this.preferencesWindow) {
            this.preferencesWindow.focus();
            return;
        }

        console.log('⚙️ Creating preferences window...');

        this.preferencesWindow = new BrowserWindow({
            width: 600,
            height: 500,
            minWidth: 500,
            minHeight: 400,
            resizable: true,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            titleBarStyle: 'hiddenInset',
            show: false,
            parent: this.mainWindow || undefined,
            modal: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, '../preload/index.js'),
                webSecurity: true,
                allowRunningInsecureContent: false
            }
        });

        // Load preferences content
        const preferencesPath = path.join(__dirname, '../renderer/preferences.html');
        this.preferencesWindow.loadFile(preferencesPath);

        // Show when ready
        this.preferencesWindow.once('ready-to-show', () => {
            this.preferencesWindow?.show();
        });

        // Clean up reference when closed
        this.preferencesWindow.on('closed', () => {
            this.preferencesWindow = null;
        });
    }

    private setupMenu(): void {
        const menu = createMenu(this);
        app.setApplicationMenu(menu);
    }

    private setupIPC(): void {
        setupIPC(this);
    }

    private setupAutoUpdater(): void {
        if (isProduction && this.mainWindow) {
            this.autoUpdater = new AutoUpdater(this.mainWindow);
        }
    }

    public getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    public getPreferencesWindow(): BrowserWindow | null {
        return this.preferencesWindow;
    }

    public openFiles(): void {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('open-files-dialog');
        }
    }

    public clearFileList(): void {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('clear-file-list');
        }
    }
}

// Create app instance
const subzillaApp = new SubzillaApp();

// Export for use in other modules
export default subzillaApp;