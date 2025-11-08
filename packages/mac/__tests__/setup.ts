/**
 * Test Setup File for Mac Desktop Application
 *
 * This file provides common test utilities, mocks, and setup
 * for all Mac application tests.
 */

import { jest } from '@jest/globals';

/**
 * Mock Electron BrowserWindow
 */
export const createMockBrowserWindow = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    loadFile: jest.fn(),
    loadURL: jest.fn(),
    once: jest.fn((event: string, callback: () => void) => {
        if (event === 'ready-to-show') {
            callback();
        }
    }),
    on: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    close: jest.fn(),
    destroy: jest.fn(),
    isDestroyed: jest.fn(() => false),
    webContents: {
        send: jest.fn(),
        on: jest.fn(),
        openDevTools: jest.fn(),
        setWindowOpenHandler: jest.fn(),
        executeJavaScript: jest.fn(),
    },
    ...overrides,
});

/**
 * Mock Electron app
 */
export const createMockApp = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
    exit: jest.fn(),
    getVersion: jest.fn(() => '1.0.0'),
    getName: jest.fn(() => 'Subzilla'),
    getPath: jest.fn((name: string) => `/mock/path/${name}`),
    clearRecentDocuments: jest.fn(),
    dock: {
        setBadge: jest.fn(),
        getBadge: jest.fn(() => ''),
        hide: jest.fn(),
        show: jest.fn(),
        bounce: jest.fn(),
    },
    ...overrides,
});

/**
 * Mock Electron dialog
 */
export const createMockDialog = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    showOpenDialog: jest.fn(() =>
        Promise.resolve({
            canceled: false,
            filePaths: ['/mock/file.srt'],
        }),
    ),
    showSaveDialog: jest.fn(() =>
        Promise.resolve({
            canceled: false,
            filePath: '/mock/output.srt',
        }),
    ),
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })),
    showMessageBoxSync: jest.fn(() => 0),
    showErrorBox: jest.fn(),
    ...overrides,
});

/**
 * Mock Electron shell
 */
export const createMockShell = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    openExternal: jest.fn(() => Promise.resolve()),
    openPath: jest.fn(() => Promise.resolve('')),
    showItemInFolder: jest.fn(),
    beep: jest.fn(),
    ...overrides,
});

/**
 * Mock Electron Menu
 */
export const createMockMenu = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    buildFromTemplate: jest.fn((template) => template),
    setApplicationMenu: jest.fn(),
    getApplicationMenu: jest.fn(),
    popup: jest.fn(),
    closePopup: jest.fn(),
    ...overrides,
});

/**
 * Mock IPC Main
 */
export const createMockIpcMain = (): Record<string, unknown> => {
    const handlers = new Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>();

    return {
        handle: jest.fn((channel: string, handler: (event: unknown, ...args: unknown[]) => Promise<unknown>) => {
            handlers.set(channel, handler);
        }),
        on: jest.fn(),
        once: jest.fn(),
        removeHandler: jest.fn((channel: string) => {
            handlers.delete(channel);
        }),
        removeAllListeners: jest.fn(),
        // Helper to trigger handlers in tests
        _triggerHandler: async (channel: string, event: unknown, ...args: unknown[]): Promise<unknown> => {
            const handler = handlers.get(channel);

            if (handler) {
                return await handler(event, ...args);
            }
            throw new Error(`No handler registered for channel: ${channel}`);
        },
        _getHandler: (channel: string) => handlers.get(channel),
        _handlers: handlers,
    };
};

/**
 * Mock IPC Renderer
 */
export const createMockIpcRenderer = (): Record<string, unknown> => ({
    invoke: jest.fn(() => Promise.resolve()),
    send: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
});

/**
 * Mock electron-store
 */
export const createMockStore = (initialData: Record<string, unknown> = {}): Record<string, unknown> => ({
    get: jest.fn((key: string, defaultValue?: unknown): unknown => {
        return initialData[key] !== undefined ? initialData[key] : defaultValue;
    }),
    set: jest.fn((key: string | Record<string, unknown>, value?: unknown): void => {
        if (typeof key === 'object') {
            Object.assign(initialData, key);
        } else {
            initialData[key] = value;
        }
    }),
    delete: jest.fn((key: string) => {
        delete initialData[key];
    }),
    clear: jest.fn(() => {
        Object.keys(initialData).forEach((key) => delete initialData[key]);
    }),
    has: jest.fn((key: string) => key in initialData),
    store: initialData,
    path: '/mock/config.json',
    size: Object.keys(initialData).length,
});

/**
 * Mock SubtitleProcessor
 */
export const createMockSubtitleProcessor = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    processFile: jest.fn(() =>
        Promise.resolve({
            outputPath: '/mock/output.srt',
            backupPath: '/mock/backup.srt',
            originalEncoding: 'windows-1256',
            resultEncoding: 'utf-8',
        }),
    ),
    detectEncoding: jest.fn(() => Promise.resolve('utf-8')),
    ...overrides,
});

/**
 * Mock BatchProcessor
 */
export const createMockBatchProcessor = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    processBatch: jest.fn(() =>
        Promise.resolve({
            successful: 5,
            failed: 1,
            total: 6,
            skipped: 0,
            duration: 1500,
        }),
    ),
    ...overrides,
});

/**
 * Mock ConfigMapper
 */
export const createMockConfigMapper = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    getConfig: jest.fn(() =>
        Promise.resolve({
            input: { encoding: 'auto', format: 'auto' },
            output: {
                encoding: 'utf8',
                createBackup: false,
                overwriteBackup: false,
                bom: true,
                lineEndings: 'auto',
            },
            strip: {
                html: false,
                colors: false,
                styles: false,
                bidiControl: true,
            },
            batch: {
                parallel: true,
                chunkSize: 5,
                skipExisting: false,
            },
        }),
    ),
    saveConfig: jest.fn(() => Promise.resolve()),
    resetConfig: jest.fn(() => Promise.resolve()),
    getConfigPath: jest.fn(() => '/mock/config.json'),
    getDefaultConfigData: jest.fn(() => ({
        input: { encoding: 'auto', format: 'auto' },
        output: { encoding: 'utf8', createBackup: false },
    })),
    getFormattingPresets: jest.fn(() => ({
        None: { html: false, colors: false },
        'Basic Clean': { html: true, colors: true },
        'Deep Clean': { html: true, colors: true, urls: true },
    })),
    ...overrides,
});

/**
 * Mock AutoUpdater
 */
export const createMockAutoUpdater = (): Record<string, unknown> => {
    const listeners = new Map<string, ((...args: unknown[]) => void)[]>();

    return {
        autoDownload: false,
        autoInstallOnAppQuit: true,
        on: jest.fn((event: string, callback: (...args: unknown[]) => void) => {
            if (!listeners.has(event)) {
                listeners.set(event, []);
            }
            listeners.get(event)!.push(callback);
        }),
        checkForUpdatesAndNotify: jest.fn(),
        checkForUpdates: jest.fn(),
        downloadUpdate: jest.fn(),
        quitAndInstall: jest.fn(),
        // Helper to trigger events in tests
        _emit: (event: string, ...args: unknown[]): void => {
            const eventListeners = listeners.get(event);

            if (eventListeners) {
                eventListeners.forEach((listener) => listener(...args));
            }
        },
    };
};

/**
 * Test file paths
 */
export const TEST_FILES = {
    validSrt: '/test/files/valid.srt',
    validSub: '/test/files/valid.sub',
    validAss: '/test/files/valid.ass',
    invalidMp4: '/test/files/invalid.mp4',
    alreadyProcessed: '/test/files/already.subzilla.srt',
    arabic: '/test/files/arabic.srt',
    withSpaces: '/test/files/file with spaces.srt',
};

/**
 * Test configurations
 */
export const TEST_CONFIGS = {
    default: {
        input: { encoding: 'auto', format: 'auto' },
        output: { encoding: 'utf8', createBackup: false },
        strip: {},
        batch: {},
    },
    withBackup: {
        input: { encoding: 'auto', format: 'auto' },
        output: { encoding: 'utf8', createBackup: true, overwriteBackup: false },
        strip: {},
        batch: {},
    },
    arabicOptimized: {
        input: { encoding: 'auto', format: 'auto' },
        output: { encoding: 'utf8', bom: true },
        strip: { html: true, colors: true, bidiControl: true },
        batch: {},
    },
};

/**
 * Wait for async operations
 */
export const waitFor = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for condition to be true
 */
export const waitForCondition = async (
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 100,
): Promise<void> => {
    const startTime = Date.now();

    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout waiting for condition');
        }
        await waitFor(interval);
    }
};

/**
 * Suppress console output during tests
 */
export const suppressConsole = (): void => {
    const originalConsole = { ...console };

    beforeEach(() => {
        global.console.log = jest.fn();
        global.console.error = jest.fn();
        global.console.warn = jest.fn();
        global.console.info = jest.fn();
    });

    afterEach(() => {
        global.console = originalConsole;
    });
};

/**
 * Setup test environment
 */
export const setupTestEnvironment = (): void => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

    // Mock platform
    Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true,
    });
};

/**
 * Clean up test environment
 */
export const cleanupTestEnvironment = (): void => {
    jest.clearAllMocks();
    jest.resetModules();
};
