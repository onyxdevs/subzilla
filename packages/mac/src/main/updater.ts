import { dialog, BrowserWindow, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';

export class AutoUpdater {
    private mainWindow: BrowserWindow;

    constructor(mainWindow: BrowserWindow) {
        console.log('🔄 Initializing auto-updater...');
        this.mainWindow = mainWindow;
        this.setupUpdater();
    }

    private setupUpdater(): void {
        // Configure updater
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        // Check for updates on startup (after 3 seconds)
        setTimeout(() => {
            autoUpdater.checkForUpdatesAndNotify();
        }, 3000);

        // Update available
        autoUpdater.on('update-available', (info) => {
            console.log('📦 Update available:', info.version);

            const response = dialog.showMessageBoxSync(this.mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: `A new version of Subzilla is available (v${info.version})`,
                detail: 'Would you like to download it now? The update will be installed when you restart the app.',
                buttons: ['Download', 'Later'],
                defaultId: 0,
                cancelId: 1,
            });

            if (response === 0) {
                autoUpdater.downloadUpdate();

                // Show notification
                new Notification({
                    title: 'Subzilla Update',
                    body: 'Downloading update in the background...',
                    silent: false,
                }).show();
            }
        });

        // Update not available
        autoUpdater.on('update-not-available', () => {
            console.log('✅ App is up to date');
        });

        // Download progress
        autoUpdater.on('download-progress', (progressObj) => {
            const percent = Math.round(progressObj.percent);

            console.log(`📥 Download progress: ${percent}%`);

            // Update dock badge with download progress
            if (process.platform === 'darwin') {
                const { app } = require('electron');

                app.dock.setBadge(`${percent}%`);
            }

            // Send progress to renderer
            this.mainWindow.webContents.send('update-download-progress', {
                percent,
                transferred: progressObj.transferred,
                total: progressObj.total,
            });
        });

        // Update downloaded
        autoUpdater.on('update-downloaded', (info) => {
            console.log('✅ Update downloaded:', info.version);

            // Clear dock badge
            if (process.platform === 'darwin') {
                const { app } = require('electron');

                app.dock.setBadge('');
            }

            const response = dialog.showMessageBoxSync(this.mainWindow, {
                type: 'info',
                title: 'Update Ready',
                message: `Update v${info.version} has been downloaded`,
                detail: 'The update will be installed when you restart Subzilla. Would you like to restart now?',
                buttons: ['Restart Now', 'Later'],
                defaultId: 0,
                cancelId: 1,
            });

            if (response === 0) {
                autoUpdater.quitAndInstall();
            }
        });

        // Update error
        autoUpdater.on('error', (error) => {
            console.error('❌ Auto-updater error:', error);

            // Don't show error dialog for network issues
            if (!error.message.includes('net::')) {
                dialog.showErrorBox('Update Error', `There was a problem updating Subzilla: ${error.message}`);
            }
        });

        console.log('✅ Auto-updater setup complete');
    }

    public checkForUpdates(): void {
        console.log('🔍 Manually checking for updates...');
        autoUpdater.checkForUpdatesAndNotify();
    }

    public downloadUpdate(): void {
        console.log('📥 Manually downloading update...');
        autoUpdater.downloadUpdate();
    }

    public quitAndInstall(): void {
        console.log('🔄 Quitting and installing update...');
        autoUpdater.quitAndInstall();
    }
}
