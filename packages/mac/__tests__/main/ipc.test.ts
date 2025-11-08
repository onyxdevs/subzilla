import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ipcMain, dialog, shell } from 'electron';

import { SubtitleProcessor, BatchProcessor } from '@subzilla/core';
import { IConfig, IConvertOptions, IBatchStats } from '@subzilla/types';

// Mock Electron modules
jest.mock('electron', () => ({
    ipcMain: {
        handle: jest.fn(),
    },
    dialog: {
        showOpenDialog: jest.fn(),
    },
    shell: {
        showItemInFolder: jest.fn(),
        openPath: jest.fn(),
    },
    app: {
        getVersion: jest.fn(() => '1.0.0'),
        getName: jest.fn(() => 'Subzilla'),
    },
}));

// Mock core modules
jest.mock('@subzilla/core', () => ({
    SubtitleProcessor: jest.fn(),
    BatchProcessor: jest.fn(),
    ConfigManager: jest.fn(),
}));

// Mock preferences
jest.mock('../../src/main/preferences', () => ({
    ConfigMapper: jest.fn(),
}));

interface IMockAppInstance {
    createPreferencesWindow: jest.Mock;
    getPreferencesWindow: jest.Mock<() => { close: jest.Mock } | null>;
}

interface IMockSubtitleProcessor {
    processFile: jest.MockedFunction<(...args: unknown[]) => Promise<{ outputPath: string; backupPath?: string }>>;
}

interface IMockBatchProcessor {
    processBatch: jest.MockedFunction<(...args: unknown[]) => Promise<IBatchStats>>;
}

interface IMockConfigMapper {
    getConfig: jest.MockedFunction<() => Promise<Partial<IConfig>>>;
    saveConfig: jest.MockedFunction<(config: IConfig) => Promise<void>>;
    resetConfig: jest.MockedFunction<() => Promise<void>>;
    getConfigPath: jest.Mock<() => string>;
    getDefaultConfigData: jest.MockedFunction<() => IConfig & { app: unknown }>;
}

describe('IPC Handlers', () => {
    let ipcHandlers: Map<string, (event: unknown, ...args: unknown[]) => Promise<unknown>>;
    let mockAppInstance: IMockAppInstance;
    let mockSubtitleProcessor: IMockSubtitleProcessor;
    let mockBatchProcessor: IMockBatchProcessor;
    let mockConfigMapper: IMockConfigMapper;

    beforeEach(() => {
        jest.clearAllMocks();

        // Map to store IPC handlers
        ipcHandlers = new Map();

        // Mock ipcMain.handle to capture handlers
        (ipcMain.handle as jest.Mock).mockImplementation((...args: unknown[]) => {
            const [channel, handler] = args as [string, (event: unknown, ...args: unknown[]) => Promise<unknown>];

            ipcHandlers.set(channel, handler);
        });

        // Mock app instance
        mockAppInstance = {
            createPreferencesWindow: jest.fn(),
            getPreferencesWindow: jest.fn(() => ({
                close: jest.fn(),
            })),
        };

        // Mock SubtitleProcessor
        mockSubtitleProcessor = {
            processFile: jest.fn(),
        };
        (SubtitleProcessor as jest.Mock).mockImplementation(() => mockSubtitleProcessor);

        // Mock BatchProcessor
        mockBatchProcessor = {
            processBatch: jest.fn(),
        };
        (BatchProcessor as jest.Mock).mockImplementation(() => mockBatchProcessor);

        // Mock ConfigMapper
        mockConfigMapper = {
            getConfig: jest.fn(),
            saveConfig: jest.fn(),
            resetConfig: jest.fn(),
            getConfigPath: jest.fn(() => '/path/to/config.json'),
            getDefaultConfigData: jest.fn(),
        };

        const { ConfigMapper } = require('../../src/main/preferences');

        (ConfigMapper as jest.Mock).mockImplementation(() => mockConfigMapper);
    });

    const getHandler = (channel: string): ((event: unknown, ...args: unknown[]) => Promise<unknown>) => {
        const handler = ipcHandlers.get(channel);

        if (!handler) {
            throw new Error(`No handler registered for channel: ${channel}`);
        }

        return handler;
    };

    describe('File Dialog Handlers', () => {
        it('should handle show-open-dialog', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const mockResult = {
                canceled: false,
                filePaths: ['/path/to/file1.srt', '/path/to/file2.srt'],
            };

            (
                dialog.showOpenDialog as jest.Mock<() => Promise<{ canceled: boolean; filePaths: string[] }>>
            ).mockResolvedValue(mockResult);

            const handler = getHandler('show-open-dialog');
            const result = (await handler({}, {})) as { canceled: boolean; filePaths: string[] };

            expect(dialog.showOpenDialog).toHaveBeenCalledWith({
                title: 'Select Subtitle Files',
                filters: [
                    { name: 'Subtitle Files', extensions: ['srt', 'sub', 'ass', 'ssa', 'txt'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
                properties: ['openFile', 'multiSelections'],
            });
            expect(result).toEqual(mockResult);
        });
    });

    describe('File Validation', () => {
        it('should validate subtitle files correctly', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('validate-files');
            const filePaths = [
                '/path/to/valid.srt',
                '/path/to/valid.sub',
                '/path/to/invalid.mp4',
                '/path/to/already.subzilla.srt',
            ];

            const result = (await handler({}, filePaths)) as { validFiles: string[]; invalidFiles: string[] };

            expect(result.validFiles).toEqual(['/path/to/valid.srt', '/path/to/valid.sub']);
            expect(result.invalidFiles).toEqual(['/path/to/invalid.mp4', '/path/to/already.subzilla.srt']);
        });

        it('should validate all supported subtitle extensions', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('validate-files');
            const filePaths = [
                '/path/to/file.srt',
                '/path/to/file.sub',
                '/path/to/file.ass',
                '/path/to/file.ssa',
                '/path/to/file.txt',
            ];

            const result = (await handler({}, filePaths)) as { validFiles: string[]; invalidFiles: string[] };

            expect(result.validFiles).toHaveLength(5);
            expect(result.invalidFiles).toHaveLength(0);
        });

        it('should handle mixed case file extensions', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('validate-files');
            const filePaths = ['/path/to/file.SRT', '/path/to/file.Sub', '/path/to/file.ASS'];

            const result = (await handler({}, filePaths)) as { validFiles: string[]; invalidFiles: string[] };

            expect(result.validFiles).toHaveLength(3);
        });
    });

    describe('File Processing', () => {
        it('should process a single file successfully', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.getConfig.mockResolvedValue({
                output: { encoding: 'utf8', createBackup: true },
                strip: { html: true },
            });

            mockSubtitleProcessor.processFile.mockResolvedValue({
                outputPath: '/path/to/output.srt',
                backupPath: '/path/to/backup.srt',
            });

            const handler = getHandler('process-file');
            const result = await handler({}, '/path/to/input.srt');

            expect(mockSubtitleProcessor.processFile).toHaveBeenCalled();
            expect(result).toEqual({
                success: true,
                outputPath: '/path/to/output.srt',
                backupPath: '/path/to/backup.srt',
            });
        });

        it('should skip already processed files', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('process-file');
            const result = await handler({}, '/path/to/file.subzilla.srt');

            expect(mockSubtitleProcessor.processFile).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: 'File has already been processed by Subzilla',
            });
        });

        it('should handle processing errors', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.getConfig.mockResolvedValue({
                output: { encoding: 'utf8' },
            });

            mockSubtitleProcessor.processFile.mockRejectedValue(new Error('Invalid file format'));

            const handler = getHandler('process-file');
            const result = await handler({}, '/path/to/invalid.srt');

            expect(result).toEqual({
                success: false,
                error: 'Invalid file format',
            });
        });

        it('should apply custom options to file processing', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.getConfig.mockResolvedValue({
                output: { encoding: 'utf8' },
                strip: { html: false },
            });

            mockSubtitleProcessor.processFile.mockResolvedValue({
                outputPath: '/path/to/output.srt',
            });

            const customOptions: IConvertOptions = {
                backupOriginal: true,
            };

            const handler = getHandler('process-file');

            await handler({}, '/path/to/input.srt', customOptions);

            expect(mockSubtitleProcessor.processFile).toHaveBeenCalledWith(
                '/path/to/input.srt',
                undefined,
                expect.objectContaining({
                    backupOriginal: true,
                }),
            );
        });
    });

    describe('Batch Processing', () => {
        it('should process multiple files in batch', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.getConfig.mockResolvedValue({
                output: { encoding: 'utf8' },
                batch: { parallel: true, chunkSize: 5 },
            });

            const mockStats: IBatchStats = {
                successful: 3,
                failed: 1,
                total: 4,
                skipped: 0,
                errors: [],
                timeTaken: 1,
                averageTimePerFile: 0.25,
                directoriesProcessed: 1,
                filesByDirectory: {},
                startTime: 0,
                endTime: 1000,
            };

            mockBatchProcessor.processBatch.mockResolvedValue(mockStats);

            const mockEvent = { sender: { send: jest.fn() } };
            const filePaths = ['/file1.srt', '/file2.srt', '/file3.srt'];

            const handler = getHandler('process-files-batch');
            const result = await handler(mockEvent, filePaths);

            expect(mockBatchProcessor.processBatch).toHaveBeenCalled();
            expect(result).toEqual({
                success: true,
                stats: mockStats,
            });
        });

        it('should handle batch processing errors', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.getConfig.mockResolvedValue({
                output: { encoding: 'utf8' },
                batch: { parallel: true },
            });

            mockBatchProcessor.processBatch.mockRejectedValue(new Error('Batch failed'));

            const mockEvent = { sender: { send: jest.fn() } };
            const handler = getHandler('process-files-batch');
            const result = await handler(mockEvent, ['/file1.srt']);

            expect(result).toEqual({
                success: false,
                error: 'Batch failed',
            });
        });

        it('should apply custom batch options', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.getConfig.mockResolvedValue({
                output: { encoding: 'utf8' },
                batch: { parallel: true, chunkSize: 5 },
            });

            mockBatchProcessor.processBatch.mockResolvedValue({
                successful: 1,
                failed: 0,
                total: 1,
                skipped: 0,
                errors: [],
                timeTaken: 0.5,
                averageTimePerFile: 0.5,
                directoriesProcessed: 1,
                filesByDirectory: {},
                startTime: 0,
                endTime: 500,
            });

            const customOptions: IConvertOptions = {
                backupOriginal: true,
            };

            const mockEvent = { sender: { send: jest.fn() } };
            const handler = getHandler('process-files-batch');

            await handler(mockEvent, ['/file1.srt'], customOptions);

            expect(mockBatchProcessor.processBatch).toHaveBeenCalledWith(
                '/file1.srt',
                expect.objectContaining({
                    common: expect.objectContaining({
                        backupOriginal: true,
                        encoding: 'utf8',
                    }),
                }),
            );
        });
    });

    describe('Configuration Handlers', () => {
        it('should get configuration', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const mockConfig: IConfig = {
                input: { encoding: 'auto', format: 'auto' },
                output: { encoding: 'utf8', createBackup: false },
                strip: { html: true },
                batch: { parallel: true },
            };

            mockConfigMapper.getConfig.mockResolvedValue(mockConfig);

            const handler = getHandler('get-config');
            const result = await handler({}, {});

            expect(result).toEqual(mockConfig);
        });

        it('should return default config on error', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const defaultConfig: IConfig & { app: unknown } = {
                input: { encoding: 'auto', format: 'auto' },
                output: { encoding: 'utf8', createBackup: false },
                strip: {},
                batch: {},
                app: {},
            };

            mockConfigMapper.getConfig.mockRejectedValue(new Error('Config not found'));
            mockConfigMapper.getDefaultConfigData.mockReturnValue(defaultConfig);

            const handler = getHandler('get-config');
            const result = await handler({}, {});

            expect(result).toEqual(defaultConfig);
        });

        it('should save configuration', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.saveConfig.mockResolvedValue(undefined);

            const newConfig: IConfig = {
                input: { encoding: 'auto', format: 'auto' },
                output: { encoding: 'utf8', createBackup: true },
                strip: { html: true, colors: true },
                batch: { parallel: false },
            };

            const handler = getHandler('save-config');
            const result = await handler({}, newConfig);

            expect(mockConfigMapper.saveConfig).toHaveBeenCalledWith(newConfig);
            expect(result).toEqual({ success: true });
        });

        it('should handle save configuration errors', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.saveConfig.mockRejectedValue(new Error('Permission denied'));

            const handler = getHandler('save-config');
            const result = await handler({}, {} as IConfig);

            expect(result).toEqual({
                success: false,
                error: 'Permission denied',
            });
        });

        it('should reset configuration', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.resetConfig.mockResolvedValue(undefined);

            const handler = getHandler('reset-config');
            const result = await handler({}, {});

            expect(mockConfigMapper.resetConfig).toHaveBeenCalled();
            expect(result).toEqual({ success: true });
        });

        it('should handle reset configuration errors', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockConfigMapper.resetConfig.mockRejectedValue(new Error('Reset failed'));

            const handler = getHandler('reset-config');
            const result = await handler({}, {});

            expect(result).toEqual({
                success: false,
                error: 'Reset failed',
            });
        });
    });

    describe('Window Management Handlers', () => {
        it('should show preferences window', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('show-preferences');

            await handler({}, {});

            expect(mockAppInstance.createPreferencesWindow).toHaveBeenCalled();
        });

        it('should close preferences window', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const mockPrefsWindow = { close: jest.fn() };

            mockAppInstance.getPreferencesWindow.mockReturnValue(mockPrefsWindow);

            const handler = getHandler('close-preferences');

            await handler({}, {});

            expect(mockPrefsWindow.close).toHaveBeenCalled();
        });

        it('should handle close preferences when window is null', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            mockAppInstance.getPreferencesWindow.mockReturnValue(null);

            const handler = getHandler('close-preferences');

            // Should not throw
            expect(() => handler({}, {})).not.toThrow();
        });
    });

    describe('File System Handlers', () => {
        it('should show file in Finder', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('show-in-finder');

            await handler({}, '/path/to/file.srt');

            expect(shell.showItemInFolder).toHaveBeenCalledWith('/path/to/file.srt');
        });

        it('should open file externally', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('open-file-external');

            await handler({}, '/path/to/file.srt');

            expect(shell.openPath).toHaveBeenCalledWith('/path/to/file.srt');
        });
    });

    describe('App Info Handlers', () => {
        it('should get app version', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('get-app-version');
            const result = await handler({}, {});

            expect(result).toBe('1.0.0');
        });

        it('should get app name', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('get-app-name');
            const result = await handler({}, {});

            expect(result).toBe('Subzilla');
        });

        it('should get config path', async () => {
            const { setupIPC } = await import('../../src/main/ipc');

            setupIPC(mockAppInstance);

            const handler = getHandler('get-config-path');
            const result = await handler({}, {});

            expect(result).toBe('/path/to/config.json');
        });
    });
});
