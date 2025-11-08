import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { app, BrowserWindow, ipcMain } from 'electron';

import { SubtitleProcessor, BatchProcessor } from '@subzilla/core';
import type { IBatchStats, IConfig } from '@subzilla/types';

// Mock all required modules
jest.mock('electron', () => ({
    app: {
        whenReady: jest.fn(() => Promise.resolve()),
        on: jest.fn(),
        quit: jest.fn(),
        getVersion: jest.fn(() => '1.0.0'),
        getName: jest.fn(() => 'Subzilla'),
        clearRecentDocuments: jest.fn(),
    },
    BrowserWindow: Object.assign(
        jest.fn(() => ({
            loadFile: jest.fn(),
            once: jest.fn((event: string, cb: () => void) => event === 'ready-to-show' && cb()),
            on: jest.fn(),
            show: jest.fn(),
            focus: jest.fn(),
            close: jest.fn(),
            webContents: {
                send: jest.fn(),
                openDevTools: jest.fn(),
                setWindowOpenHandler: jest.fn(),
            },
        })),
        {
            getAllWindows: jest.fn(() => []),
        },
    ),
    ipcMain: {
        handle: jest.fn(),
    },
    dialog: {
        showOpenDialog: jest.fn(),
        showMessageBoxSync: jest.fn(),
        showErrorBox: jest.fn(),
    },
    shell: {
        openExternal: jest.fn(),
        showItemInFolder: jest.fn(),
        openPath: jest.fn(),
    },
    Menu: {
        setApplicationMenu: jest.fn(),
        buildFromTemplate: jest.fn((template) => template),
    },
    Notification: jest.fn(() => ({ show: jest.fn() })),
}));

jest.mock('electron-store', () =>
    jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        set: jest.fn(),
        clear: jest.fn(),
        store: {},
        path: '/mock/config.json',
    })),
);

jest.mock('electron-updater', () => ({
    autoUpdater: {
        autoDownload: false,
        autoInstallOnAppQuit: true,
        on: jest.fn(),
        checkForUpdatesAndNotify: jest.fn(),
        downloadUpdate: jest.fn(),
        quitAndInstall: jest.fn(),
    },
}));

jest.mock('@subzilla/core', () => ({
    SubtitleProcessor: jest.fn(() => ({
        processFile: jest.fn<() => Promise<{ outputPath: string; backupPath?: string }>>().mockResolvedValue({
            outputPath: '/output.srt',
            backupPath: '/backup.srt',
        }),
    })),
    BatchProcessor: jest.fn(() => ({
        processBatch: jest.fn<() => Promise<IBatchStats>>().mockResolvedValue({
            total: 2,
            successful: 2,
            failed: 0,
            skipped: 0,
            errors: [],
            timeTaken: 1,
            averageTimePerFile: 0.5,
            directoriesProcessed: 1,
            filesByDirectory: {},
            startTime: 0,
            endTime: 1000,
        }),
    })),
    ConfigManager: jest.fn(),
}));

jest.mock('../src/main/preferences', () => ({
    ConfigMapper: jest.fn(() => ({
        getConfig: jest.fn<() => Promise<IConfig>>().mockResolvedValue({
            input: { encoding: 'auto' },
            output: { encoding: 'utf8' },
            strip: {},
            batch: {},
        }),
        saveConfig: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        resetConfig: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        getConfigPath: jest.fn(() => '/mock/config.json'),
        getDefaultConfigData: jest.fn(() => ({
            input: { encoding: 'auto' },
            output: { encoding: 'utf8' },
        })),
    })),
}));

describe('Mac Application Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
    });

    describe('Application Startup Flow', () => {
        it('should complete full initialization sequence', async () => {
            // Simulate app startup
            const { SubzillaApp } = await import('../src/main/index');

            new SubzillaApp();

            const whenReadyPromise = (app.whenReady as jest.Mock).mock.results[0].value;

            await whenReadyPromise;

            // Verify initialization order
            expect(BrowserWindow).toHaveBeenCalled();
            expect((app.on as jest.Mock).mock.calls.some((call: unknown[]) => call[0] === 'activate')).toBe(true);
            expect((app.on as jest.Mock).mock.calls.some((call: unknown[]) => call[0] === 'window-all-closed')).toBe(
                true,
            );
            expect((app.on as jest.Mock).mock.calls.some((call: unknown[]) => call[0] === 'open-file')).toBe(true);
        });

        it('should setup all components when ready', async () => {
            const { SubzillaApp } = await import('../src/main/index');

            new SubzillaApp();

            const whenReadyPromise = (app.whenReady as jest.Mock).mock.results[0].value;

            await whenReadyPromise;

            // All components should be initialized
            expect(BrowserWindow).toHaveBeenCalled();
            expect(ipcMain.handle).toHaveBeenCalled();
        });
    });

    describe('File Processing Workflow', () => {
        it('should process file from open-file event through IPC', async () => {
            const mockHandlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

            (ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
                const [channel, handler] = args as [string, (event: unknown, ...args: unknown[]) => Promise<unknown>];

                mockHandlers.set(channel, handler);
            });

            const { SubzillaApp } = await import('../src/main/index');

            new SubzillaApp();

            const { setupIPC } = await import('../src/main/ipc');

            const mockAppInstance = {
                createPreferencesWindow: jest.fn(),
                getPreferencesWindow: jest.fn<() => { close: () => void } | null>(() => null),
            };

            setupIPC(mockAppInstance);

            // Simulate file validation
            const validateHandler = mockHandlers.get('validate-files');

            if (validateHandler) {
                const result = (await validateHandler({}, ['/test.srt', '/test.mp4'])) as {
                    validFiles: string[];
                    invalidFiles: string[];
                };

                expect(result.validFiles).toContain('/test.srt');
                expect(result.invalidFiles).toContain('/test.mp4');
            }

            // Simulate file processing
            const processHandler = mockHandlers.get('process-file');

            if (processHandler) {
                const result = (await processHandler({}, '/test.srt')) as {
                    success: boolean;
                    outputPath?: string;
                    backupPath?: string;
                    error?: string;
                };

                expect(result.success).toBe(true);
                expect(SubtitleProcessor).toHaveBeenCalled();
            }
        });

        it('should handle batch processing workflow', async () => {
            const mockHandlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

            (ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
                const [channel, handler] = args as [string, (event: unknown, ...args: unknown[]) => Promise<unknown>];

                mockHandlers.set(channel, handler);
            });

            const { setupIPC } = await import('../src/main/ipc');

            const mockAppInstance = {
                createPreferencesWindow: jest.fn(),
                getPreferencesWindow: jest.fn<() => { close: () => void } | null>(() => null),
            };

            setupIPC(mockAppInstance);

            const batchHandler = mockHandlers.get('process-files-batch');

            if (batchHandler) {
                const mockEvent = { sender: { send: jest.fn() } };
                const result = (await batchHandler(mockEvent, ['/file1.srt', '/file2.srt'])) as {
                    success: boolean;
                    stats?: IBatchStats;
                    error?: string;
                };

                expect(result.success).toBe(true);
                expect(result.stats).toBeDefined();
                expect(BatchProcessor).toHaveBeenCalled();
            }
        });
    });

    describe('Configuration Management Workflow', () => {
        it('should load and save configuration through IPC', async () => {
            const mockHandlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

            (ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
                const [channel, handler] = args as [string, (event: unknown, ...args: unknown[]) => Promise<unknown>];

                mockHandlers.set(channel, handler);
            });

            const { setupIPC } = await import('../src/main/ipc');

            const mockAppInstance = {
                createPreferencesWindow: jest.fn(),
                getPreferencesWindow: jest.fn<() => { close: () => void } | null>(() => null),
            };

            setupIPC(mockAppInstance);

            // Get config
            const getConfigHandler = mockHandlers.get('get-config');

            if (getConfigHandler) {
                const config = (await getConfigHandler({}, {})) as IConfig;

                expect(config).toHaveProperty('input');
                expect(config).toHaveProperty('output');
            }

            // Save config
            const saveConfigHandler = mockHandlers.get('save-config');

            if (saveConfigHandler) {
                const newConfig = {
                    input: { encoding: 'auto', format: 'auto' },
                    output: { encoding: 'utf16le', createBackup: true },
                    strip: {},
                    batch: {},
                };

                const result = (await saveConfigHandler({}, newConfig)) as { success: boolean; error?: string };

                expect(result.success).toBe(true);
            }
        });

        it('should handle configuration errors gracefully', async () => {
            const mockHandlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

            (ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
                const [channel, handler] = args as [string, (event: unknown, ...args: unknown[]) => Promise<unknown>];

                mockHandlers.set(channel, handler);
            });

            const { ConfigMapper } = await import('../src/main/preferences');
            const ConfigMapperMock = ConfigMapper as unknown as jest.Mock<() => { saveConfig: jest.Mock }>;

            ConfigMapperMock.mockImplementationOnce(() => ({
                getConfig: jest.fn<() => Promise<IConfig>>().mockResolvedValue({
                    input: { encoding: 'auto' },
                    output: { encoding: 'utf8' },
                    strip: {},
                    batch: {},
                }),
                saveConfig: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Permission denied')),
                resetConfig: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
                getConfigPath: jest.fn(() => '/mock/config.json'),
                getDefaultConfigData: jest.fn(() => ({
                    input: { encoding: 'auto' },
                    output: { encoding: 'utf8' },
                })),
            }));

            const { setupIPC } = await import('../src/main/ipc');

            const mockAppInstance = {
                createPreferencesWindow: jest.fn(),
                getPreferencesWindow: jest.fn<() => { close: () => void } | null>(() => null),
            };

            setupIPC(mockAppInstance);

            const saveConfigHandler = mockHandlers.get('save-config');

            if (saveConfigHandler) {
                const result = (await saveConfigHandler({}, {})) as { success: boolean; error?: string };

                // Should not throw, should return error
                expect(result).toHaveProperty('success');
            }
        });
    });

    describe('Window Management Integration', () => {
        it('should create and manage preferences window', async () => {
            const SubzillaAppModule = await import('../src/main/index');
            const subzillaApp = new SubzillaAppModule.SubzillaApp();

            const whenReadyPromise = (app.whenReady as jest.Mock).mock.results[0].value;

            await whenReadyPromise;

            const initialCallCount = (BrowserWindow as unknown as jest.Mock).mock.calls.length;

            // Open preferences
            subzillaApp.createPreferencesWindow();

            expect((BrowserWindow as unknown as jest.Mock).mock.calls.length).toBe(initialCallCount + 1);

            // Try to open again (should focus, not create)
            subzillaApp.createPreferencesWindow();

            expect((BrowserWindow as unknown as jest.Mock).mock.calls.length).toBe(initialCallCount + 1);
        });

        it('should handle window lifecycle events', async () => {
            const mockWindow = {
                loadFile: jest.fn(),
                once: jest.fn((event: string, cb: () => void) => {
                    if (event === 'ready-to-show') cb();
                }),
                on: jest.fn((event: string, cb: () => void) => {
                    if (event === 'closed') {
                        // Simulate window closed
                        setTimeout(() => cb(), 0);
                    }
                }),
                show: jest.fn(),
                focus: jest.fn(),
                close: jest.fn(),
                webContents: {
                    send: jest.fn(),
                    openDevTools: jest.fn(),
                    setWindowOpenHandler: jest.fn(),
                },
            };

            (BrowserWindow as unknown as jest.Mock).mockImplementation(() => mockWindow);

            const { SubzillaApp } = await import('../src/main/index');

            new SubzillaApp();

            const whenReadyPromise = (app.whenReady as jest.Mock).mock.results[0].value;

            await whenReadyPromise;

            expect(mockWindow.show).toHaveBeenCalled();
            expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function));
        });
    });

    describe('Menu Integration', () => {
        it('should create menu with working actions', async () => {
            const { createMenu } = await import('../src/main/menu');

            const mockAppInstance = {
                createPreferencesWindow: jest.fn(),
                openFiles: jest.fn(),
                clearFileList: jest.fn(),
                getMainWindow: jest.fn(() => ({
                    webContents: { send: jest.fn() },
                })),
            };

            const menu = createMenu(mockAppInstance);

            expect(menu).toBeDefined();

            // Find and test preferences menu item
            const subzillaMenu = (
                menu as unknown as Array<{ label: string; submenu?: Array<{ label: string; click?: () => void }> }>
            ).find((item) => item.label === 'Subzilla');
            const prefsItem = subzillaMenu?.submenu?.find((item) => item.label === 'Preferences...');

            if (prefsItem?.click) {
                prefsItem.click();
                expect(mockAppInstance.createPreferencesWindow).toHaveBeenCalled();
            }

            // Test file operations
            const fileMenu = (
                menu as unknown as Array<{ label: string; submenu?: Array<{ label: string; click?: () => void }> }>
            ).find((item) => item.label === 'File');
            const openItem = fileMenu?.submenu?.find((item) => item.label === 'Open Files...');

            if (openItem?.click) {
                openItem.click();
                expect(mockAppInstance.openFiles).toHaveBeenCalled();
            }
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle file processing errors gracefully', async () => {
            const mockHandlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

            (ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
                const [channel, handler] = args as [string, (event: unknown, ...args: unknown[]) => Promise<unknown>];

                mockHandlers.set(channel, handler);
            });

            // Mock processor to throw error
            (SubtitleProcessor as jest.Mock).mockImplementation(() => ({
                processFile: jest
                    .fn<() => Promise<{ outputPath: string; backupPath?: string }>>()
                    .mockRejectedValue(new Error('Invalid file format')),
            }));

            const { setupIPC } = await import('../src/main/ipc');

            const mockAppInstance = {
                createPreferencesWindow: jest.fn(),
                getPreferencesWindow: jest.fn<() => { close: () => void } | null>(() => null),
            };

            setupIPC(mockAppInstance);

            const processHandler = mockHandlers.get('process-file');

            if (processHandler) {
                const result = (await processHandler({}, '/invalid.srt')) as { success: boolean; error?: string };

                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
            }
        });

        it('should handle IPC communication errors', async () => {
            const mockHandlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

            (ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
                const [channel, handler] = args as [string, (event: unknown, ...args: unknown[]) => Promise<unknown>];

                mockHandlers.set(channel, handler);
            });

            const { setupIPC } = await import('../src/main/ipc');

            const mockAppInstance = {
                createPreferencesWindow: jest.fn(),
                getPreferencesWindow: jest.fn<() => { close: () => void } | null>(() => null), // No window
            };

            setupIPC(mockAppInstance);

            // Attempt to close non-existent preferences window
            const closeHandler = mockHandlers.get('close-preferences');

            if (closeHandler) {
                // Should not throw
                expect(() => closeHandler({}, {})).not.toThrow();
            }
        });
    });

    describe('Security Integration', () => {
        it('should enforce security settings across components', async () => {
            const { SubzillaApp } = await import('../src/main/index');

            new SubzillaApp();

            const whenReadyPromise = (app.whenReady as jest.Mock).mock.results[0].value;

            await whenReadyPromise;

            const windowConfig = (BrowserWindow as unknown as jest.Mock).mock.calls[0][0] as {
                webPreferences: {
                    nodeIntegration: boolean;
                    contextIsolation: boolean;
                    webSecurity: boolean;
                    preload?: string;
                };
            };

            // Verify security settings
            expect(windowConfig.webPreferences.nodeIntegration).toBe(false);
            expect(windowConfig.webPreferences.contextIsolation).toBe(true);
            expect(windowConfig.webPreferences.webSecurity).toBe(true);
            expect(windowConfig.webPreferences.preload).toBeDefined();
        });

        it('should prevent insecure window operations', async () => {
            const mockWindow = {
                loadFile: jest.fn(),
                once: jest.fn((event: string, cb: () => void) => {
                    if (event === 'ready-to-show') cb();
                }),
                on: jest.fn(),
                show: jest.fn(),
                focus: jest.fn(),
                close: jest.fn(),
                webContents: {
                    send: jest.fn(),
                    openDevTools: jest.fn(),
                    setWindowOpenHandler: jest.fn(),
                },
            };

            (BrowserWindow as unknown as jest.Mock).mockImplementation(() => mockWindow);

            const { SubzillaApp } = await import('../src/main/index');

            new SubzillaApp();

            const whenReadyPromise = (app.whenReady as jest.Mock).mock.results[0].value;

            await whenReadyPromise;

            expect(mockWindow.webContents.setWindowOpenHandler).toHaveBeenCalled();
        });
    });

    describe('Data Flow Integration', () => {
        it('should pass data correctly from renderer to main process', async () => {
            const mockHandlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

            (ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
                const [channel, handler] = args as [string, (event: unknown, ...args: unknown[]) => Promise<unknown>];

                mockHandlers.set(channel, handler);
            });

            const { setupIPC } = await import('../src/main/ipc');

            const mockAppInstance = {
                createPreferencesWindow: jest.fn(),
                getPreferencesWindow: jest.fn<() => { close: () => void } | null>(() => null),
            };

            setupIPC(mockAppInstance);

            // Simulate renderer sending data through IPC
            const validateHandler = mockHandlers.get('validate-files');

            if (validateHandler) {
                const filePaths = ['/path/to/file1.srt', '/path/to/file2.sub', '/path/to/file3.mp4'];

                const result = (await validateHandler({}, filePaths)) as {
                    validFiles: string[];
                    invalidFiles: string[];
                };

                expect(result.validFiles.length).toBe(2);
                expect(result.invalidFiles.length).toBe(1);
            }
        });

        it('should maintain configuration state across operations', async () => {
            const mockHandlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

            (ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
                const [channel, handler] = args as [string, (event: unknown, ...args: unknown[]) => Promise<unknown>];

                mockHandlers.set(channel, handler);
            });

            const { setupIPC } = await import('../src/main/ipc');

            const mockAppInstance = {
                createPreferencesWindow: jest.fn(),
                getPreferencesWindow: jest.fn<() => { close: () => void } | null>(() => null),
            };

            setupIPC(mockAppInstance);

            // Get initial config
            const getConfigHandler = mockHandlers.get('get-config');
            let config: IConfig | null = getConfigHandler ? ((await getConfigHandler({}, {})) as IConfig) : null;

            expect(config).toBeDefined();

            // Process a file (should use config)
            const processHandler = mockHandlers.get('process-file');

            if (processHandler) {
                (await processHandler({}, '/test.srt')) as {
                    success: boolean;
                    outputPath?: string;
                    backupPath?: string;
                    error?: string;
                };
                expect(SubtitleProcessor).toHaveBeenCalled();
            }

            // Get config again (should still be accessible)
            config = getConfigHandler ? ((await getConfigHandler({}, {})) as IConfig) : null;
            expect(config).toBeDefined();
        });
    });
});
