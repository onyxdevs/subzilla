import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { dialog, Notification, BrowserWindow } from 'electron';

// Mock electron-updater
const mockAutoUpdater = {
    autoDownload: false,
    autoInstallOnAppQuit: true,
    on: jest.fn(),
    checkForUpdatesAndNotify: jest.fn(),
    downloadUpdate: jest.fn(),
    quitAndInstall: jest.fn(),
};

jest.mock('electron-updater', () => ({
    autoUpdater: mockAutoUpdater,
}));

// Mock Electron modules
jest.mock('electron', () => ({
    dialog: {
        showMessageBoxSync: jest.fn(),
        showErrorBox: jest.fn(),
    },
    BrowserWindow: jest.fn(),
    Notification: jest.fn().mockImplementation((...args: unknown[]) => {
        const options = (args[0] as Record<string, unknown>) || {};

        return {
            show: jest.fn(),
            ...options,
        };
    }),
    app: {
        dock: {
            setBadge: jest.fn(),
        },
    },
}));

interface IMockWindow {
    webContents: {
        send: jest.Mock;
    };
}

describe('AutoUpdater', () => {
    let mockWindow: IMockWindow;
    let updateCallbacks: Map<string, (...args: unknown[]) => void>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock BrowserWindow
        mockWindow = {
            webContents: {
                send: jest.fn(),
            },
        };

        // Map to store event callbacks
        updateCallbacks = new Map();

        // Mock autoUpdater.on to capture event handlers
        mockAutoUpdater.on.mockImplementation((...args: unknown[]) => {
            const [event, callback] = args as [string, (...args: unknown[]) => void];

            updateCallbacks.set(event, callback);

            return mockAutoUpdater;
        });

        // Reset platform
        Object.defineProperty(process, 'platform', {
            value: 'darwin',
            configurable: true,
        });
    });

    const triggerEvent = (event: string, ...args: unknown[]): void => {
        const callback = updateCallbacks.get(event);

        if (callback) {
            callback(...args);
        }
    };

    describe('Initialization', () => {
        it('should initialize auto-updater with correct settings', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            expect(mockAutoUpdater.autoDownload).toBe(false);
            expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(true);
        });

        it('should check for updates after initialization', async () => {
            jest.useFakeTimers();

            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            jest.advanceTimersByTime(3000);

            expect(mockAutoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();

            jest.useRealTimers();
        });

        it('should register all event listeners', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function));
            expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function));
            expect(mockAutoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function));
            expect(mockAutoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function));
            expect(mockAutoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function));
        });
    });

    describe('Update Available', () => {
        it('should show dialog when update is available', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(1); // Later

            const updateInfo = { version: '2.0.0' };

            triggerEvent('update-available', updateInfo);

            expect(dialog.showMessageBoxSync).toHaveBeenCalledWith(
                mockWindow as unknown as BrowserWindow,
                expect.objectContaining({
                    type: 'info',
                    title: 'Update Available',
                    message: 'A new version of Subzilla is available (v2.0.0)',
                    buttons: ['Download', 'Later'],
                }),
            );
        });

        it('should download update when user clicks Download', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(0); // Download

            const updateInfo = { version: '2.0.0' };

            triggerEvent('update-available', updateInfo);

            expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
        });

        it('should show notification when downloading update', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(0); // Download

            const updateInfo = { version: '2.0.0' };

            triggerEvent('update-available', updateInfo);

            expect(Notification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Subzilla Update',
                    body: 'Downloading update in the background...',
                }),
            );
        });

        it('should not download update when user clicks Later', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(1); // Later

            const updateInfo = { version: '2.0.0' };

            triggerEvent('update-available', updateInfo);

            expect(mockAutoUpdater.downloadUpdate).not.toHaveBeenCalled();
        });
    });

    describe('Update Not Available', () => {
        it('should log when no update is available', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            triggerEvent('update-not-available');

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('up to date'));

            consoleSpy.mockRestore();
        });
    });

    describe('Download Progress', () => {
        it('should send progress to renderer', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            const progressObj = {
                percent: 45.5,
                transferred: 4500000,
                total: 10000000,
            };

            triggerEvent('download-progress', progressObj);

            expect(mockWindow.webContents.send).toHaveBeenCalledWith(
                'update-download-progress',
                expect.objectContaining({
                    percent: 46, // Rounded
                    transferred: 4500000,
                    total: 10000000,
                }),
            );
        });

        it('should update dock badge on macOS', async () => {
            const { app } = require('electron');

            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            const progressObj = { percent: 75, transferred: 7500000, total: 10000000 };

            triggerEvent('download-progress', progressObj);

            expect(app.dock.setBadge).toHaveBeenCalledWith('75%');
        });

        it('should not update dock badge on non-macOS platforms', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                configurable: true,
            });

            const { app } = require('electron');

            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            const progressObj = { percent: 75, transferred: 7500000, total: 10000000 };

            triggerEvent('download-progress', progressObj);

            expect(app.dock.setBadge).not.toHaveBeenCalled();
        });

        it('should round progress percentage', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            const progressObj = { percent: 33.333, transferred: 3333, total: 10000 };

            triggerEvent('download-progress', progressObj);

            expect(mockWindow.webContents.send).toHaveBeenCalledWith(
                'update-download-progress',
                expect.objectContaining({
                    percent: 33,
                }),
            );
        });
    });

    describe('Update Downloaded', () => {
        it('should clear dock badge when update is downloaded', async () => {
            const { app } = require('electron');

            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            const updateInfo = { version: '2.0.0' };

            (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(1); // Later

            triggerEvent('update-downloaded', updateInfo);

            expect(app.dock.setBadge).toHaveBeenCalledWith('');
        });

        it('should show dialog when update is downloaded', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(1); // Later

            const updateInfo = { version: '2.0.0' };

            triggerEvent('update-downloaded', updateInfo);

            expect(dialog.showMessageBoxSync).toHaveBeenCalledWith(
                mockWindow as unknown as BrowserWindow,
                expect.objectContaining({
                    type: 'info',
                    title: 'Update Ready',
                    message: 'Update v2.0.0 has been downloaded',
                    buttons: ['Restart Now', 'Later'],
                }),
            );
        });

        it('should restart app when user clicks Restart Now', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(0); // Restart Now

            const updateInfo = { version: '2.0.0' };

            triggerEvent('update-downloaded', updateInfo);

            expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled();
        });

        it('should not restart app when user clicks Later', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            (dialog.showMessageBoxSync as jest.Mock).mockReturnValue(1); // Later

            const updateInfo = { version: '2.0.0' };

            triggerEvent('update-downloaded', updateInfo);

            expect(mockAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should show error dialog for non-network errors', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            const error = new Error('Permission denied');

            triggerEvent('error', error);

            expect(dialog.showErrorBox).toHaveBeenCalledWith(
                'Update Error',
                'There was a problem updating Subzilla: Permission denied',
            );
        });

        it('should not show error dialog for network errors', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            const error = new Error('net::ERR_CONNECTION_REFUSED');

            triggerEvent('error', error);

            expect(dialog.showErrorBox).not.toHaveBeenCalled();
        });

        it('should log errors to console', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const { AutoUpdater } = await import('../../src/main/updater');

            new AutoUpdater(mockWindow as unknown as BrowserWindow);

            const error = new Error('Update failed');

            triggerEvent('error', error);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Auto-updater error'), error);

            consoleSpy.mockRestore();
        });
    });

    describe('Manual Update Methods', () => {
        it('should check for updates manually', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');
            const updater = new AutoUpdater(mockWindow as unknown as BrowserWindow);

            mockAutoUpdater.checkForUpdatesAndNotify.mockClear();

            updater.checkForUpdates();

            expect(mockAutoUpdater.checkForUpdatesAndNotify).toHaveBeenCalled();
        });

        it('should download update manually', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');
            const updater = new AutoUpdater(mockWindow as unknown as BrowserWindow);

            mockAutoUpdater.downloadUpdate.mockClear();

            updater.downloadUpdate();

            expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
        });

        it('should quit and install manually', async () => {
            const { AutoUpdater } = await import('../../src/main/updater');
            const updater = new AutoUpdater(mockWindow as unknown as BrowserWindow);

            mockAutoUpdater.quitAndInstall.mockClear();

            updater.quitAndInstall();

            expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled();
        });
    });
});
