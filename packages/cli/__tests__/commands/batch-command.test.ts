import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { IBatchCommandOptions, IConfig, ICommandDefinition } from '@subzilla/types';

import { BatchCommandCreator } from '../../src/commands/batch-command';

// Mock the core modules
jest.mock('@subzilla/core', () => ({
    BatchProcessor: jest.fn(),
    ConfigManager: {
        loadConfig: jest.fn(),
    },
}));

describe('BatchCommandCreator', () => {
    let commandCreator: BatchCommandCreator;
    let tempDir: string;
    let mockConsoleLog: jest.MockedFunction<typeof console.log>;
    let mockConsoleError: jest.MockedFunction<typeof console.error>;
    let mockProcessExit: jest.MockedFunction<typeof process.exit>;

    beforeEach(async () => {
        commandCreator = new BatchCommandCreator();
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-batch-test-'));

        // Mock console methods
        mockConsoleLog = console.log as jest.MockedFunction<typeof console.log>;
        mockConsoleError = console.error as jest.MockedFunction<typeof console.error>;
        mockProcessExit = process.exit as jest.MockedFunction<typeof process.exit>;

        // Clear all mocks
        jest.clearAllMocks();

        // Setup mocks
        const { BatchProcessor, ConfigManager } = require('@subzilla/core');
        const mockProcessBatch = jest
            .fn<
                () => Promise<{
                    total: number;
                    successful: number;
                    failed: number;
                    skipped: number;
                    errors: unknown[];
                    timeTaken: number;
                    averageTimePerFile: number;
                    directoriesProcessed: number;
                    filesByDirectory: Record<string, unknown>;
                    startTime: number;
                    endTime: number;
                }>
            >()
            .mockResolvedValue({
                total: 3,
                successful: 3,
                failed: 0,
                skipped: 0,
                errors: [],
                timeTaken: 1.5,
                averageTimePerFile: 0.5,
                directoriesProcessed: 1,
                filesByDirectory: {},
                startTime: Date.now(),
                endTime: Date.now(),
            });

        (BatchProcessor as jest.Mock).mockImplementation(() => ({
            processBatch: mockProcessBatch,
        }));

        ConfigManager.loadConfig.mockResolvedValue({
            config: {
                output: {
                    createBackup: false,
                    overwriteBackup: true,
                    bom: true,
                    lineEndings: 'auto',
                    overwriteInput: false,
                    overwriteExisting: false,
                },
                batch: {
                    retryCount: 0,
                    retryDelay: 1000,
                    recursive: false,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                },
            },
            source: 'default',
        });
    });

    afterEach(async () => {
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('getDefinition', () => {
        it('should return correct command definition', () => {
            const definition = (
                commandCreator as unknown as { getDefinition(): ICommandDefinition<IBatchCommandOptions> }
            ).getDefinition();

            expect(definition.name).toBe('batch');
            expect(definition.description).toBe('Convert multiple subtitle files to UTF-8');
            expect(definition.arguments).toBeDefined();
            expect(definition.arguments).toHaveLength(1);
            expect(definition.arguments![0].name).toBe('pattern');
            expect(definition.arguments![0].description).toContain('glob pattern');
            expect(definition.options).toBeDefined();
            expect(typeof definition.action).toBe('function');
        });

        it('should have all required options', () => {
            const definition = (
                commandCreator as unknown as { getDefinition(): ICommandDefinition<IBatchCommandOptions> }
            ).getDefinition();
            const optionFlags = definition.options?.map((opt) => opt.flags) ?? [];

            // Base options
            expect(optionFlags).toContain('-b, --backup');
            expect(optionFlags).toContain('--no-overwrite-backup');
            expect(optionFlags).toContain('--bom');
            expect(optionFlags).toContain('--line-endings <type>');
            expect(optionFlags).toContain('--overwrite-existing');
            expect(optionFlags).toContain('--retry-count <number>');
            expect(optionFlags).toContain('--retry-delay <ms>');

            // Strip options
            expect(optionFlags).toContain('--strip-html');
            expect(optionFlags).toContain('--strip-colors');
            expect(optionFlags).toContain('--strip-styles');
            expect(optionFlags).toContain('--strip-urls');
            expect(optionFlags).toContain('--strip-timestamps');
            expect(optionFlags).toContain('--strip-numbers');
            expect(optionFlags).toContain('--strip-punctuation');
            expect(optionFlags).toContain('--strip-emojis');
            expect(optionFlags).toContain('--strip-brackets');
            expect(optionFlags).toContain('--strip-bidi-control');
            expect(optionFlags).toContain('--strip-all');

            // Batch-specific options
            expect(optionFlags).toContain('-o, --output-dir <dir>');
            expect(optionFlags).toContain('-r, --recursive');
            expect(optionFlags).toContain('-p, --parallel');
            expect(optionFlags).toContain('-s, --skip-existing');
            expect(optionFlags).toContain('-d, --max-depth <depth>');
            expect(optionFlags).toContain('-i, --include-dirs <dirs...>');
            expect(optionFlags).toContain('-x, --exclude-dirs <dirs...>');
            expect(optionFlags).toContain('--preserve-structure');
        });
    });

    describe('action', () => {
        let definition: ICommandDefinition<IBatchCommandOptions>;
        const testPattern = '**/*.srt';

        beforeEach(() => {
            definition = (
                commandCreator as unknown as { getDefinition(): ICommandDefinition<IBatchCommandOptions> }
            ).getDefinition();
        });

        it('should successfully process batch with default options', async () => {
            const options: IBatchCommandOptions = {};

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockConsoleLog).toHaveBeenCalledWith('🧬 Output options:', expect.any(Object));
            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.any(Object),
                    batch: expect.any(Object),
                }),
            );
        });

        it('should pass outputDir to batch processor', async () => {
            const outputDir = path.join(tempDir, 'output');
            const options: IBatchCommandOptions = {
                outputDir,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        outputDir,
                    }),
                }),
            );
        });

        it('should handle recursive option', async () => {
            const options: IBatchCommandOptions = {
                recursive: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        recursive: true,
                    }),
                }),
            );
        });

        it('should handle parallel option', async () => {
            const options: IBatchCommandOptions = {
                parallel: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        parallel: true,
                    }),
                }),
            );
        });

        it('should handle skipExisting option', async () => {
            const options: IBatchCommandOptions = {
                skipExisting: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        skipExisting: true,
                    }),
                }),
            );
        });

        it('should handle maxDepth option', async () => {
            const options: IBatchCommandOptions = {
                maxDepth: '3',
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        maxDepth: 3,
                    }),
                }),
            );
        });

        it('should handle includeDirectories option', async () => {
            const options: IBatchCommandOptions = {
                includeDirs: ['dir1', 'dir2'],
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        includeDirectories: ['dir1', 'dir2'],
                    }),
                }),
            );
        });

        it('should handle excludeDirectories option', async () => {
            const options: IBatchCommandOptions = {
                excludeDirs: ['node_modules', '.git'],
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        excludeDirectories: ['node_modules', '.git'],
                    }),
                }),
            );
        });

        it('should handle preserveStructure option', async () => {
            const options: IBatchCommandOptions = {
                preserveStructure: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        preserveStructure: true,
                    }),
                }),
            );
        });

        it('should handle chunkSize option', async () => {
            const options: IBatchCommandOptions = {
                chunkSize: 10,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        chunkSize: 10,
                    }),
                }),
            );
        });

        it('should handle all batch options combined', async () => {
            const outputDir = path.join(tempDir, 'output');
            const options: IBatchCommandOptions = {
                outputDir,
                recursive: true,
                parallel: true,
                skipExisting: true,
                maxDepth: '3',
                includeDirs: ['dir1'],
                excludeDirs: ['node_modules'],
                preserveStructure: true,
                chunkSize: 5,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        outputDir,
                        recursive: true,
                        parallel: true,
                        skipExisting: true,
                        maxDepth: 3,
                        includeDirectories: ['dir1'],
                        excludeDirectories: ['node_modules'],
                        preserveStructure: true,
                        chunkSize: 5,
                    }),
                }),
            );
        });

        it('should handle backup option', async () => {
            const options: IBatchCommandOptions = {
                backup: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        backupOriginal: true,
                    }),
                }),
            );
        });

        it('should handle overwriteBackup option', async () => {
            const options: IBatchCommandOptions = {
                overwriteBackup: false,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        overwriteBackup: false,
                    }),
                }),
            );
        });

        it('should handle bom option', async () => {
            const options: IBatchCommandOptions = {
                bom: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        bom: true,
                    }),
                }),
            );
        });

        it('should handle lineEndings option', async () => {
            const options: IBatchCommandOptions = {
                lineEndings: 'lf',
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        lineEndings: 'lf',
                    }),
                }),
            );
        });

        it('should handle overwriteInput option', async () => {
            const options: IBatchCommandOptions = {
                overwriteInput: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        overwriteInput: true,
                    }),
                }),
            );
        });

        it('should handle overwriteExisting option', async () => {
            const options: IBatchCommandOptions = {
                overwriteExisting: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        overwriteExisting: true,
                    }),
                }),
            );
        });

        it('should handle retryCount option', async () => {
            const options: IBatchCommandOptions = {
                retryCount: '3',
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        retryCount: 3,
                    }),
                }),
            );
        });

        it('should handle retryDelay option', async () => {
            const options: IBatchCommandOptions = {
                retryDelay: '2000',
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        retryDelay: 2000,
                    }),
                }),
            );
        });

        it('should handle strip options correctly', async () => {
            const options: IBatchCommandOptions = {
                stripHtml: true,
                stripColors: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        strip: expect.objectContaining({
                            html: true,
                            colors: true,
                        }),
                    }),
                }),
            );
        });

        it('should handle stripAll option', async () => {
            const options: IBatchCommandOptions = {
                stripAll: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        strip: expect.objectContaining({
                            html: true,
                            colors: true,
                            styles: true,
                            urls: true,
                            timestamps: true,
                            numbers: true,
                            punctuation: true,
                            emojis: true,
                            brackets: true,
                            bidiControl: true,
                        }),
                    }),
                }),
            );
        });

        it('should handle all strip options individually', async () => {
            const options: IBatchCommandOptions = {
                stripHtml: true,
                stripColors: true,
                stripStyles: true,
                stripUrls: true,
                stripTimestamps: true,
                stripNumbers: true,
                stripPunctuation: true,
                stripEmojis: true,
                stripBrackets: true,
                stripBidiControl: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        strip: expect.objectContaining({
                            html: true,
                            colors: true,
                            styles: true,
                            urls: true,
                            timestamps: true,
                            numbers: true,
                            punctuation: true,
                            emojis: true,
                            brackets: true,
                            bidiControl: true,
                        }),
                    }),
                }),
            );
        });

        it('should use loaded config when provided', async () => {
            const customConfig = {
                output: {
                    createBackup: true,
                    bom: false,
                },
                batch: {
                    parallel: true,
                    recursive: true,
                },
            } as IConfig;

            const options: IBatchCommandOptions = {
                loadedConfig: customConfig,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        backupOriginal: true,
                        bom: false,
                    }),
                    batch: expect.objectContaining({
                        parallel: true,
                        recursive: true,
                    }),
                }),
            );
        });

        it('should load config from ConfigManager when no loaded config is provided', async () => {
            const { ConfigManager } = require('@subzilla/core');
            const options: IBatchCommandOptions = {};

            await definition.action(testPattern, options);

            expect(ConfigManager.loadConfig).toHaveBeenCalled();
        });

        it('should not load config when loadedConfig is provided', async () => {
            const { ConfigManager } = require('@subzilla/core');
            const customConfig = {
                output: {
                    createBackup: false,
                },
            } as IConfig;

            const options: IBatchCommandOptions = {
                loadedConfig: customConfig,
            };

            await definition.action(testPattern, options);

            expect(ConfigManager.loadConfig).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            mockProcessor.processBatch.mockRejectedValueOnce(new Error('Batch processing failed'));

            const options: IBatchCommandOptions = {};

            await definition.action(testPattern, options);

            expect(mockConsoleError).toHaveBeenCalledWith('❌ Error:', 'Batch processing failed');
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });

        it('should merge options with config correctly', async () => {
            const customConfig = {
                output: {
                    createBackup: true,
                    bom: true,
                    lineEndings: 'crlf' as const,
                },
                batch: {
                    retryCount: 2,
                    retryDelay: 500,
                    recursive: true,
                },
            } as IConfig;

            const options: IBatchCommandOptions = {
                loadedConfig: customConfig,
                backup: false, // Override config
                parallel: true, // New option not in config
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        backupOriginal: false, // Should use option value
                        bom: true, // Should use config value
                        lineEndings: 'crlf', // Should use config value
                        retryCount: 2, // Should use config value
                        retryDelay: 500, // Should use config value
                    }),
                    batch: expect.objectContaining({
                        parallel: true, // Should use option value
                        recursive: true, // Should use config value
                    }),
                }),
            );
        });

        it('should log output options before processing', async () => {
            const options: IBatchCommandOptions = {};

            await definition.action(testPattern, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    common: expect.any(Object),
                    batch: expect.any(Object),
                }),
            );
        });

        it('should handle complex glob patterns', async () => {
            const complexPattern = 'src/**/*.{srt,vtt}';
            const options: IBatchCommandOptions = {};

            await definition.action(complexPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(complexPattern, expect.any(Object));
        });

        it('should handle boolean options correctly', async () => {
            const options: IBatchCommandOptions = {
                bom: true,
                overwriteInput: true,
                overwriteExisting: true,
                overwriteBackup: false,
                backup: true,
                recursive: true,
                parallel: true,
                skipExisting: true,
                preserveStructure: true,
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        bom: true,
                        overwriteInput: true,
                        overwriteExisting: true,
                        overwriteBackup: false,
                        backupOriginal: true,
                    }),
                    batch: expect.objectContaining({
                        recursive: true,
                        parallel: true,
                        skipExisting: true,
                        preserveStructure: true,
                    }),
                }),
            );
        });

        it('should handle numeric string options and convert them to numbers', async () => {
            const options: IBatchCommandOptions = {
                retryCount: '5',
                retryDelay: '3000',
                maxDepth: '10',
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        retryCount: 5,
                        retryDelay: 3000,
                    }),
                    batch: expect.objectContaining({
                        maxDepth: 10,
                    }),
                }),
            );
        });

        it('should pass through config defaults when no options are provided', async () => {
            const { ConfigManager } = require('@subzilla/core');

            ConfigManager.loadConfig.mockResolvedValueOnce({
                config: {
                    output: {
                        createBackup: true,
                        overwriteBackup: false,
                        bom: false,
                        lineEndings: 'lf',
                        overwriteInput: false,
                        overwriteExisting: true,
                    },
                    batch: {
                        retryCount: 3,
                        retryDelay: 2000,
                        recursive: true,
                        parallel: false,
                        skipExisting: true,
                        maxDepth: 5,
                        preserveStructure: true,
                    },
                },
                source: 'default',
            });

            const options: IBatchCommandOptions = {};

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    common: expect.objectContaining({
                        backupOriginal: true,
                        overwriteBackup: false,
                        bom: false,
                        lineEndings: 'lf',
                        overwriteInput: false,
                        overwriteExisting: true,
                        retryCount: 3,
                        retryDelay: 2000,
                    }),
                    batch: expect.objectContaining({
                        recursive: true,
                        parallel: false,
                        skipExisting: true,
                        maxDepth: 5,
                        preserveStructure: true,
                    }),
                }),
            );
        });

        it('should handle empty arrays for include/exclude directories', async () => {
            const options: IBatchCommandOptions = {
                includeDirs: [],
                excludeDirs: [],
            };

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            expect(mockProcessor.processBatch).toHaveBeenCalledWith(
                testPattern,
                expect.objectContaining({
                    batch: expect.objectContaining({
                        includeDirectories: [],
                        excludeDirectories: [],
                    }),
                }),
            );
        });

        it('should handle undefined strip options when no strip flags are set', async () => {
            const options: IBatchCommandOptions = {};

            await definition.action(testPattern, options);

            const { BatchProcessor } = require('@subzilla/core');
            const mockProcessor = new BatchProcessor();

            // When no strip options are set, strip should be undefined
            const callArgs = mockProcessor.processBatch.mock.calls[0][1];

            expect(callArgs.common.strip).toBeUndefined();
        });
    });
});
