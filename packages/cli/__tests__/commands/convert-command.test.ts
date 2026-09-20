import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { IConvertCommandOptions, IConfig, ICommandDefinition } from '@subzilla/types';

import { ConvertCommandCreator } from '../../src/commands/convert-command';

// Mock the core modules
jest.mock('@subzilla/core', () => ({
    SubtitleProcessor: jest.fn(),
    ConfigManager: {
        loadConfig: jest.fn(),
    },
}));

type TProcessFile = (...args: unknown[]) => Promise<{ outputPath: string; backupPath?: string }>;

describe('ConvertCommandCreator', () => {
    let commandCreator: ConvertCommandCreator;
    let tempDir: string;
    let mockProcessFile: jest.Mock<TProcessFile>;
    let mockConsoleLog: jest.MockedFunction<typeof console.log>;
    let mockConsoleError: jest.MockedFunction<typeof console.error>;
    let mockProcessExit: jest.MockedFunction<typeof process.exit>;

    beforeEach(async () => {
        commandCreator = new ConvertCommandCreator();
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-cli-test-'));

        // Mock console methods
        mockConsoleLog = console.log as jest.MockedFunction<typeof console.log>;
        mockConsoleError = console.error as jest.MockedFunction<typeof console.error>;
        mockProcessExit = process.exit as jest.MockedFunction<typeof process.exit>;

        // Clear all mocks
        jest.clearAllMocks();

        // Setup mocks
        const { SubtitleProcessor, ConfigManager } = require('@subzilla/core');

        mockProcessFile = jest.fn<TProcessFile>().mockResolvedValue({
            outputPath: '/mock/output.srt',
            backupPath: '/mock/backup.srt',
        });

        (SubtitleProcessor as jest.Mock).mockImplementation(() => ({
            processFile: mockProcessFile,
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
                commandCreator as unknown as { getDefinition(): ICommandDefinition<IConvertCommandOptions> }
            ).getDefinition();

            expect(definition.name).toBe('convert');
            expect(definition.description).toBe('Convert a single subtitle file to UTF-8');
            expect(definition.arguments).toBeDefined();
            expect(definition.arguments).toHaveLength(1);
            expect(definition.arguments![0].name).toBe('inputFile');
            expect(definition.options).toBeDefined();
            expect(typeof definition.action).toBe('function');
        });
    });

    describe('action', () => {
        let testFilePath: string;
        let definition: ICommandDefinition<IConvertCommandOptions>;

        beforeEach(async () => {
            testFilePath = path.join(tempDir, 'test.srt');
            await fs.promises.writeFile(testFilePath, 'test content', 'utf8');
            definition = (
                commandCreator as unknown as { getDefinition(): ICommandDefinition<IConvertCommandOptions> }
            ).getDefinition();
        });

        it('should successfully process a file with default options', async () => {
            const options: IConvertCommandOptions = {};

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith('🧬 Output options:', expect.any(Object));
            expect(mockConsoleLog).toHaveBeenCalledWith('✨ Conversion successful!');
            expect(mockConsoleLog).toHaveBeenCalledWith(`Input file: ${testFilePath}`);
        });

        it('reports the output path the processor actually wrote', async () => {
            const outputPath = path.join(tempDir, 'custom-output.srt');

            mockProcessFile.mockResolvedValueOnce({ outputPath });

            await definition.action(testFilePath, { output: outputPath });

            expect(mockProcessFile).toHaveBeenCalledWith(testFilePath, outputPath, expect.any(Object));
            expect(mockConsoleLog).toHaveBeenCalledWith(`Output file: ${outputPath}`);
        });

        it('reports the INPUT path as output when the file was overwritten in place (not a guessed .subzilla path)', async () => {
            mockProcessFile.mockResolvedValueOnce({ outputPath: testFilePath });

            await definition.action(testFilePath, { overwriteInput: true });

            expect(mockConsoleLog).toHaveBeenCalledWith(`Output file: ${testFilePath}`);
            expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('.subzilla.'));
        });

        it('reports the real backup path, e.g. a numbered one', async () => {
            mockProcessFile.mockResolvedValueOnce({
                outputPath: testFilePath,
                backupPath: `${testFilePath}.bak.2`,
            });

            await definition.action(testFilePath, { backup: true });

            expect(mockConsoleLog).toHaveBeenCalledWith(`Backup file: ${testFilePath}.bak.2`);
        });

        it('prints no backup line when the processor made no backup', async () => {
            mockProcessFile.mockResolvedValueOnce({ outputPath: testFilePath });

            await definition.action(testFilePath, {});

            expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('Backup file:'));
        });

        it('should handle strip options correctly', async () => {
            const options: IConvertCommandOptions = {
                stripHtml: true,
                stripColors: true,
                stripAll: false,
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    strip: expect.objectContaining({
                        html: true,
                        colors: true,
                    }),
                }),
            );
        });

        it('should handle numeric options correctly', async () => {
            const options: IConvertCommandOptions = {
                retryCount: '3',
                retryDelay: '2000',
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    retryCount: 3,
                    retryDelay: 2000,
                }),
            );
        });

        it('should handle boolean options correctly', async () => {
            const options: IConvertCommandOptions = {
                bom: true,
                overwriteInput: true,
                overwriteExisting: true,
                overwriteBackup: false,
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    bom: true,
                    overwriteInput: true,
                    overwriteExisting: true,
                    overwriteBackup: false,
                }),
            );
        });

        it('should use loaded config when provided', async () => {
            const customConfig = {
                output: {
                    createBackup: true,
                    bom: false,
                },
            } as IConfig;

            const options: IConvertCommandOptions = {
                loadedConfig: customConfig,
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    backupOriginal: true,
                    bom: false,
                }),
            );
        });

        it('should handle errors gracefully', async () => {
            const { SubtitleProcessor } = require('@subzilla/core');
            const mockProcessor = new SubtitleProcessor();

            mockProcessor.processFile.mockRejectedValueOnce(new Error('Processing failed'));

            const options: IConvertCommandOptions = {};

            await definition.action(testFilePath, options);

            expect(mockConsoleError).toHaveBeenCalledWith('❌ Error:', 'Processing failed');
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });

        it('should handle line endings option', async () => {
            const options: IConvertCommandOptions = {
                lineEndings: 'lf',
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    lineEndings: 'lf',
                }),
            );
        });
    });

    describe('getDefaultOutputPath', () => {
        it('should generate correct default output path', () => {
            const inputFile = '/path/to/input.srt';
            const result = (
                commandCreator as unknown as { getDefaultOutputPath(file: string): string }
            ).getDefaultOutputPath(inputFile);

            expect(result).toBe('/path/to/input.subzilla.srt');
        });

        it('should handle files with multiple dots', () => {
            const inputFile = '/path/to/file.name.with.dots.srt';
            const result = (
                commandCreator as unknown as { getDefaultOutputPath(file: string): string }
            ).getDefaultOutputPath(inputFile);

            expect(result).toBe('/path/to/file.name.with.dots.subzilla.srt');
        });

        it('should handle files without extension', () => {
            const inputFile = '/path/to/filename';
            const result = (
                commandCreator as unknown as { getDefaultOutputPath(file: string): string }
            ).getDefaultOutputPath(inputFile);

            expect(result).toBe('.subzilla./path/to/filename');
        });
    });
});
