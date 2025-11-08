import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Electron modules
const mockIpcRenderer = {
    invoke: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
};

const mockContextBridge = {
    exposeInMainWorld: jest.fn(),
};

jest.mock('electron', () => ({
    contextBridge: mockContextBridge,
    ipcRenderer: mockIpcRenderer,
}));

// Type for the exposed API
type TExposedAPI = {
    showOpenDialog: () => Promise<unknown>;
    validateFiles: (filePaths: string[]) => Promise<unknown>;
    processFile: (filePath: string, options?: unknown) => Promise<unknown>;
    processFilesBatch: (filePaths: string[], options?: unknown) => Promise<unknown>;
    getConfig: () => Promise<unknown>;
    saveConfig: (config: unknown) => Promise<unknown>;
    resetConfig: () => Promise<unknown>;
    showPreferences: () => Promise<void>;
    closePreferences: () => Promise<void>;
    showInFinder: (filePath: string) => Promise<void>;
    openFileExternal: (filePath: string) => Promise<void>;
    getAppVersion: () => Promise<string>;
    getAppName: () => Promise<string>;
    getConfigPath: () => Promise<string>;
    onFileOpened: (callback: (filePath: string) => void) => void;
    onProcessingProgress: (callback: (progress: unknown) => void) => void;
    onUpdateDownloadProgress: (callback: (progress: unknown) => void) => void;
    onOpenFilesDialog: (callback: () => void) => void;
    onClearFileList: (callback: () => void) => void;
    onShowShortcuts: (callback: () => void) => void;
    removeAllListeners: (channel: string) => void;
};

describe('Preload Script - Context Bridge', () => {
    let api: TExposedAPI;

    beforeEach(async () => {
        jest.clearAllMocks();
        // Set test environment
        process.env.NODE_ENV = 'test';

        // Clear module cache to ensure fresh import
        jest.resetModules();

        // Import the API
        const preloadModule = await import('../../src/preload/index');

        api = preloadModule.api as TExposedAPI;
    });

    describe('API Exposure', () => {
        it('should not expose API in test environment', () => {
            expect(mockContextBridge.exposeInMainWorld).not.toHaveBeenCalled();
        });

        it('should expose complete API interface', async () => {
            const exposedAPI = api;

            // File operations
            expect(exposedAPI.showOpenDialog).toBeDefined();
            expect(exposedAPI.validateFiles).toBeDefined();
            expect(exposedAPI.processFile).toBeDefined();
            expect(exposedAPI.processFilesBatch).toBeDefined();

            // Configuration
            expect(exposedAPI.getConfig).toBeDefined();
            expect(exposedAPI.saveConfig).toBeDefined();
            expect(exposedAPI.resetConfig).toBeDefined();

            // Window management
            expect(exposedAPI.showPreferences).toBeDefined();
            expect(exposedAPI.closePreferences).toBeDefined();

            // System integration
            expect(exposedAPI.showInFinder).toBeDefined();
            expect(exposedAPI.openFileExternal).toBeDefined();

            // App info
            expect(exposedAPI.getAppVersion).toBeDefined();
            expect(exposedAPI.getAppName).toBeDefined();
            expect(exposedAPI.getConfigPath).toBeDefined();

            // Event listeners
            expect(exposedAPI.onFileOpened).toBeDefined();
            expect(exposedAPI.onProcessingProgress).toBeDefined();
            expect(exposedAPI.onUpdateDownloadProgress).toBeDefined();
            expect(exposedAPI.onOpenFilesDialog).toBeDefined();
            expect(exposedAPI.onClearFileList).toBeDefined();
            expect(exposedAPI.onShowShortcuts).toBeDefined();

            // Event cleanup
            expect(exposedAPI.removeAllListeners).toBeDefined();
        });
    });

    describe('File Operations', () => {
        it('should invoke show-open-dialog IPC handler', async () => {
            const mockResult = { canceled: false, filePaths: ['/path/to/file.srt'] };

            mockIpcRenderer.invoke.mockResolvedValue(mockResult);

            const result = await api.showOpenDialog();

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('show-open-dialog');
            expect(result).toEqual(mockResult);
        });

        it('should validate files through IPC', async () => {
            const filePaths = ['/file1.srt', '/file2.sub'];
            const mockResult = { validFiles: filePaths, invalidFiles: [] };

            mockIpcRenderer.invoke.mockResolvedValue(mockResult);

            const result = await api.validateFiles(filePaths);

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('validate-files', filePaths);
            expect(result).toEqual(mockResult);
        });

        it('should process single file through IPC', async () => {
            const filePath = '/path/to/file.srt';
            const options = { encoding: 'utf8' };
            const mockResult = { success: true, outputPath: '/output.srt' };

            mockIpcRenderer.invoke.mockResolvedValue(mockResult);

            const result = await api.processFile(filePath, options);

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('process-file', filePath, options);
            expect(result).toEqual(mockResult);
        });

        it('should process files in batch through IPC', async () => {
            const filePaths = ['/file1.srt', '/file2.srt'];
            const options = { createBackup: true };
            const mockResult = {
                success: true,
                stats: { successful: 2, failed: 0, total: 2 },
            };

            mockIpcRenderer.invoke.mockResolvedValue(mockResult);

            const result = await api.processFilesBatch(filePaths, options);

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('process-files-batch', filePaths, options);
            expect(result).toEqual(mockResult);
        });
    });

    describe('Configuration Operations', () => {
        it('should get configuration through IPC', async () => {
            const mockConfig = {
                input: { encoding: 'auto' },
                output: { encoding: 'utf8' },
            };

            mockIpcRenderer.invoke.mockResolvedValue(mockConfig);

            const result = await api.getConfig();

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-config');
            expect(result).toEqual(mockConfig);
        });

        it('should save configuration through IPC', async () => {
            const newConfig = {
                input: { encoding: 'auto' },
                output: { encoding: 'utf16le' },
            };
            const mockResult = { success: true };

            mockIpcRenderer.invoke.mockResolvedValue(mockResult);

            const result = await api.saveConfig(newConfig);

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('save-config', newConfig);
            expect(result).toEqual(mockResult);
        });

        it('should reset configuration through IPC', async () => {
            const mockResult = { success: true };

            mockIpcRenderer.invoke.mockResolvedValue(mockResult);

            const result = await api.resetConfig();

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('reset-config');
            expect(result).toEqual(mockResult);
        });
    });

    describe('Window Management', () => {
        it('should show preferences window through IPC', async () => {
            mockIpcRenderer.invoke.mockResolvedValue(undefined);

            await api.showPreferences();

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('show-preferences');
        });

        it('should close preferences window through IPC', async () => {
            mockIpcRenderer.invoke.mockResolvedValue(undefined);

            await api.closePreferences();

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('close-preferences');
        });
    });

    describe('System Integration', () => {
        it('should show file in Finder through IPC', async () => {
            const filePath = '/path/to/file.srt';

            mockIpcRenderer.invoke.mockResolvedValue(undefined);

            await api.showInFinder(filePath);

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('show-in-finder', filePath);
        });

        it('should open file externally through IPC', async () => {
            const filePath = '/path/to/file.srt';

            mockIpcRenderer.invoke.mockResolvedValue(undefined);

            await api.openFileExternal(filePath);

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('open-file-external', filePath);
        });
    });

    describe('App Information', () => {
        it('should get app version through IPC', async () => {
            mockIpcRenderer.invoke.mockResolvedValue('1.0.0');

            const result = await api.getAppVersion();

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-app-version');
            expect(result).toBe('1.0.0');
        });

        it('should get app name through IPC', async () => {
            mockIpcRenderer.invoke.mockResolvedValue('Subzilla');

            const result = await api.getAppName();

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-app-name');
            expect(result).toBe('Subzilla');
        });

        it('should get config path through IPC', async () => {
            mockIpcRenderer.invoke.mockResolvedValue('/path/to/config.json');

            const result = await api.getConfigPath();

            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-config-path');
            expect(result).toBe('/path/to/config.json');
        });
    });

    describe('Event Listeners', () => {
        it('should register file-opened event listener', async () => {
            const mockCallback = jest.fn();

            api.onFileOpened(mockCallback);

            expect(mockIpcRenderer.on).toHaveBeenCalledWith('file-opened', expect.any(Function));

            // Simulate event
            const registeredCallback = mockIpcRenderer.on.mock.calls.find((call) => call[0] === 'file-opened')?.[1] as
                | ((...args: unknown[]) => void)
                | undefined;

            if (!registeredCallback) throw new Error('Callback not found');

            registeredCallback({}, '/path/to/file.srt');

            expect(mockCallback).toHaveBeenCalledWith('/path/to/file.srt');
        });

        it('should register processing-progress event listener', async () => {
            const mockCallback = jest.fn();

            api.onProcessingProgress(mockCallback);

            expect(mockIpcRenderer.on).toHaveBeenCalledWith('processing-progress', expect.any(Function));

            // Simulate event
            const registeredCallback = mockIpcRenderer.on.mock.calls.find(
                (call) => call[0] === 'processing-progress',
            )?.[1] as ((...args: unknown[]) => void) | undefined;

            if (!registeredCallback) throw new Error('Callback not found');

            const progress = { current: 5, total: 10 };

            registeredCallback({}, progress);

            expect(mockCallback).toHaveBeenCalledWith(progress);
        });

        it('should register update-download-progress event listener', async () => {
            const mockCallback = jest.fn();

            api.onUpdateDownloadProgress(mockCallback);

            expect(mockIpcRenderer.on).toHaveBeenCalledWith('update-download-progress', expect.any(Function));
        });

        it('should register open-files-dialog event listener', async () => {
            const mockCallback = jest.fn();

            api.onOpenFilesDialog(mockCallback);

            expect(mockIpcRenderer.on).toHaveBeenCalledWith('open-files-dialog', expect.any(Function));

            // Simulate event
            const registeredCallback = mockIpcRenderer.on.mock.calls.find(
                (call) => call[0] === 'open-files-dialog',
            )?.[1] as ((...args: unknown[]) => void) | undefined;

            if (!registeredCallback) throw new Error('Callback not found');

            registeredCallback({});

            expect(mockCallback).toHaveBeenCalled();
        });

        it('should register clear-file-list event listener', async () => {
            const mockCallback = jest.fn();

            api.onClearFileList(mockCallback);

            expect(mockIpcRenderer.on).toHaveBeenCalledWith('clear-file-list', expect.any(Function));

            // Simulate event
            const registeredCallback = mockIpcRenderer.on.mock.calls.find(
                (call) => call[0] === 'clear-file-list',
            )?.[1] as ((...args: unknown[]) => void) | undefined;

            if (!registeredCallback) throw new Error('Callback not found');

            registeredCallback({});

            expect(mockCallback).toHaveBeenCalled();
        });

        it('should register show-shortcuts event listener', async () => {
            const mockCallback = jest.fn();

            api.onShowShortcuts(mockCallback);

            expect(mockIpcRenderer.on).toHaveBeenCalledWith('show-shortcuts', expect.any(Function));

            // Simulate event
            const registeredCallback = mockIpcRenderer.on.mock.calls.find(
                (call) => call[0] === 'show-shortcuts',
            )?.[1] as ((...args: unknown[]) => void) | undefined;

            if (!registeredCallback) throw new Error('Callback not found');

            registeredCallback({});

            expect(mockCallback).toHaveBeenCalled();
        });

        it('should remove all listeners for a channel', async () => {
            api.removeAllListeners('file-opened');

            expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalledWith('file-opened');
        });
    });

    describe('Security', () => {
        it('should use context isolation', () => {
            // In test environment, exposeInMainWorld should not be called
            expect(mockContextBridge.exposeInMainWorld).not.toHaveBeenCalled();
        });

        it('should not expose ipcRenderer directly', () => {
            expect((api as Record<string, unknown>).ipcRenderer).toBeUndefined();
        });

        it('should only expose specific IPC channels', () => {
            const exposedKeys = Object.keys(api);

            // Should not have methods to send arbitrary IPC messages
            expect(exposedKeys).not.toContain('send');
            expect(exposedKeys).not.toContain('sendSync');
            expect(exposedKeys).not.toContain('sendTo');
        });
    });

    describe('Type Safety', () => {
        it('should provide typed file processing result', async () => {
            const mockResult = {
                success: true,
                outputPath: '/output.srt',
                backupPath: '/backup.srt',
            };

            mockIpcRenderer.invoke.mockResolvedValue(mockResult);

            const result = (await api.processFile('/input.srt')) as {
                success: boolean;
                outputPath?: string;
                backupPath?: string;
            };

            expect(result).toHaveProperty('success');
            expect(result.success).toBe(true);
            expect(result.outputPath).toBeDefined();
        });

        it('should provide typed batch processing result', async () => {
            const mockResult = {
                success: true,
                stats: {
                    successful: 5,
                    failed: 1,
                    total: 6,
                    skipped: 0,
                    duration: 1000,
                },
            };

            mockIpcRenderer.invoke.mockResolvedValue(mockResult);

            const result = (await api.processFilesBatch(['/file1.srt', '/file2.srt'])) as {
                success: boolean;
                stats?: {
                    successful?: number;
                    failed?: number;
                    total?: number;
                    skipped?: number;
                    duration?: number;
                };
            };

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('stats');
            expect(result.stats?.successful).toBeDefined();
        });

        it('should provide typed config result', async () => {
            const mockConfig = {
                input: { encoding: 'auto', format: 'auto' },
                output: { encoding: 'utf8', createBackup: false },
                strip: {},
                batch: {},
            };

            mockIpcRenderer.invoke.mockResolvedValue(mockConfig);

            const result = await api.getConfig();

            expect(result).toHaveProperty('input');
            expect(result).toHaveProperty('output');
            expect(result).toHaveProperty('strip');
            expect(result).toHaveProperty('batch');
        });
    });
});
