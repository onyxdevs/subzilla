import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { IBatchOptions } from '@subzilla/types';

import BatchProcessor from '../src/BatchProcessor';

// Mock console methods to reduce test output noise
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

describe('BatchProcessor', () => {
    let processor: BatchProcessor;
    let tempDir: string;

    beforeEach(async () => {
        processor = new BatchProcessor();
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-batch-'));

        // Suppress console output during tests
        console.log = jest.fn();
        console.info = jest.fn();
    });

    afterEach(async () => {
        // Restore console methods
        console.log = originalConsoleLog;
        console.info = originalConsoleInfo;

        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    /**
     * Helper function to create test SRT files
     */
    async function createTestSrtFile(filePath: string, content?: string): Promise<void> {
        const srtContent =
            content ||
            `1
00:00:01,000 --> 00:00:03,000
Test subtitle content

2
00:00:04,000 --> 00:00:06,000
<b>Another subtitle</b>`;

        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, srtContent, 'utf8');
    }

    /**
     * Helper function to create default batch options
     */
    function createDefaultOptions(overrides?: Partial<IBatchOptions>): IBatchOptions {
        return {
            common: {
                outputDir: path.join(tempDir, 'output'),
                ...overrides?.common,
            },
            batch: {
                recursive: true,
                parallel: false,
                skipExisting: false,
                ...overrides?.batch,
            },
        };
    }

    describe('processBatch', () => {
        describe('basic batch processing', () => {
            it('should process multiple files successfully', async () => {
                // Create test files in same directory
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'file3.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(3);
                expect(stats.successful).toBe(3);
                expect(stats.failed).toBe(0);
                expect(stats.skipped).toBe(0);
                expect(stats.errors).toHaveLength(0);
                expect(stats.directoriesProcessed).toBe(1);
            });

            it('should process files from multiple directories', async () => {
                // Create test files in multiple directories
                await createTestSrtFile(path.join(tempDir, 'dir1', 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir2', 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir3', 'file3.srt'));

                const pattern = path.join(tempDir, '**', '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(3);
                expect(stats.successful).toBe(3);
                expect(stats.directoriesProcessed).toBe(3);
                expect(Object.keys(stats.filesByDirectory)).toHaveLength(3);
            });

            it('should return early when no files are found', async () => {
                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(0);
                expect(stats.successful).toBe(0);
                expect(stats.failed).toBe(0);
            });

            it('should create output directory if it does not exist', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));

                const outputDir = path.join(tempDir, 'new-output-dir');
                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    common: { outputDir },
                });

                await processor.processBatch(pattern, options);

                expect(fs.existsSync(outputDir)).toBe(true);
            });

            it('should calculate statistics correctly', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'file2.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.timeTaken).toBeGreaterThan(0);
                expect(stats.averageTimePerFile).toBeGreaterThan(0);
                expect(stats.startTime).toBeLessThan(stats.endTime || Date.now());
            });
        });

        describe('parallel vs sequential processing', () => {
            it('should process directories sequentially when parallel is false', async () => {
                await createTestSrtFile(path.join(tempDir, 'dir1', 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir2', 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir3', 'file3.srt'));

                const pattern = path.join(tempDir, '**', '*.srt');
                const options = createDefaultOptions({
                    batch: { parallel: false },
                } as Partial<IBatchOptions>);

                const stats = await processor.processBatch(pattern, options);

                expect(stats.successful).toBe(3);
                expect(stats.directoriesProcessed).toBe(3);
            });

            it('should process directories in parallel when parallel is true', async () => {
                await createTestSrtFile(path.join(tempDir, 'dir1', 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir2', 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir3', 'file3.srt'));

                const pattern = path.join(tempDir, '**', '*.srt');
                const options = createDefaultOptions({
                    batch: { parallel: true },
                } as Partial<IBatchOptions>);

                const stats = await processor.processBatch(pattern, options);

                expect(stats.successful).toBe(3);
                expect(stats.directoriesProcessed).toBe(3);
            });

            it('should process files in parallel within directories when parallel is true', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'file3.srt'));
                await createTestSrtFile(path.join(tempDir, 'file4.srt'));
                await createTestSrtFile(path.join(tempDir, 'file5.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    batch: { parallel: true, chunkSize: 2 },
                } as Partial<IBatchOptions>);

                const stats = await processor.processBatch(pattern, options);

                expect(stats.successful).toBe(5);
            });

            it('should respect custom chunk size for parallel processing', async () => {
                // Create multiple files
                for (let i = 1; i <= 10; i++) {
                    await createTestSrtFile(path.join(tempDir, `file${i}.srt`));
                }

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    batch: { parallel: true, chunkSize: 3 },
                } as Partial<IBatchOptions>);

                const stats = await processor.processBatch(pattern, options);

                expect(stats.successful).toBe(10);
            });
        });

        describe('error handling', () => {
            it('should track failed files and continue processing', async () => {
                // Create valid and invalid files
                await createTestSrtFile(path.join(tempDir, 'valid1.srt'));

                // Create a file that will fail - make it unreadable by removing read permissions
                const unreadableFile = path.join(tempDir, 'unreadable.srt');

                await fs.promises.writeFile(unreadableFile, 'content', 'utf8');
                await fs.promises.chmod(unreadableFile, 0o000);

                await createTestSrtFile(path.join(tempDir, 'valid2.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                try {
                    const stats = await processor.processBatch(pattern, options);

                    expect(stats.total).toBe(3);
                    expect(stats.successful).toBe(2);
                    expect(stats.failed).toBe(1);
                    expect(stats.errors.length).toBe(1);
                } finally {
                    // Restore permissions for cleanup
                    try {
                        await fs.promises.chmod(unreadableFile, 0o644);
                    } catch {
                        // Ignore if file doesn't exist
                    }
                }
            });

            it('should stop processing on first error when failFast is true', async () => {
                // Create a file that will fail - make it unreadable
                const unreadableFile = path.join(tempDir, 'unreadable.srt');

                await fs.promises.writeFile(unreadableFile, 'content', 'utf8');
                await fs.promises.chmod(unreadableFile, 0o000);

                await createTestSrtFile(path.join(tempDir, 'valid1.srt'));
                await createTestSrtFile(path.join(tempDir, 'valid2.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    common: { failFast: true },
                });

                try {
                    await expect(processor.processBatch(pattern, options)).rejects.toThrow();
                } finally {
                    // Restore permissions for cleanup
                    try {
                        await fs.promises.chmod(unreadableFile, 0o644);
                    } catch {
                        // Ignore if file doesn't exist
                    }
                }
            });

            it('should record error details in stats', async () => {
                // Create a file that will fail - make it unreadable
                const unreadableFile = path.join(tempDir, 'unreadable.srt');

                await fs.promises.writeFile(unreadableFile, 'content', 'utf8');
                await fs.promises.chmod(unreadableFile, 0o000);

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                try {
                    const stats = await processor.processBatch(pattern, options);

                    expect(stats.errors.length).toBe(1);
                    expect(stats.errors[0]).toHaveProperty('file');
                    expect(stats.errors[0]).toHaveProperty('error');
                    expect(stats.errors[0].file).toContain('unreadable.srt');
                } finally {
                    // Restore permissions for cleanup
                    try {
                        await fs.promises.chmod(unreadableFile, 0o644);
                    } catch {
                        // Ignore if file doesn't exist
                    }
                }
            });
        });

        describe('retry logic', () => {
            it('should retry failed files according to retryCount', async () => {
                // Create a valid file first
                await createTestSrtFile(path.join(tempDir, 'test.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    common: { retryCount: 2, retryDelay: 10 },
                });

                // Mock processFile to fail on first 2 attempts, then succeed
                let attemptCount = 0;
                const originalProcessFile = processor['processor'].processFile.bind(processor['processor']);
                const mockProcessFile = jest.fn(async (...args: Parameters<typeof originalProcessFile>) => {
                    attemptCount++;

                    if (attemptCount <= 2) {
                        throw new Error('Simulated processing error');
                    }

                    return originalProcessFile(...args);
                });

                processor['processor'].processFile = mockProcessFile as typeof originalProcessFile;

                const stats = await processor.processBatch(pattern, options);

                // Should succeed after 2 retries
                expect(stats.successful).toBe(1);
                expect(stats.failed).toBe(0);
                expect(attemptCount).toBe(3); // Initial + 2 retries
            });

            it('should use custom retry delay', async () => {
                // Create a valid file first
                await createTestSrtFile(path.join(tempDir, 'test.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    common: { retryCount: 2, retryDelay: 50 },
                });

                // Mock processFile to always fail
                const mockProcessFile = jest.fn(async () => {
                    throw new Error('Simulated processing error');
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                processor['processor'].processFile = mockProcessFile as any;

                const startTime = Date.now();

                await processor.processBatch(pattern, options);

                const endTime = Date.now();

                // Should have waited at least 2 * retryDelay (2 retries with 50ms delay each)
                expect(endTime - startTime).toBeGreaterThanOrEqual(100);
                expect(mockProcessFile).toHaveBeenCalledTimes(3); // Initial + 2 retries
            });
        });

        describe('skip existing files', () => {
            it('should skip files that already exist in output directory', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'file2.srt'));

                const outputDir = path.join(tempDir, 'output');
                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    common: { outputDir },
                    batch: { skipExisting: false },
                } as Partial<IBatchOptions>);

                // First run - process all files
                const stats1 = await processor.processBatch(pattern, options);

                expect(stats1.successful).toBe(2);
                expect(stats1.skipped).toBe(0);

                // Create new processor for second run
                const processor2 = new BatchProcessor();

                // Second run with skipExisting - should skip all
                const options2 = createDefaultOptions({
                    common: { outputDir },
                    batch: { skipExisting: true },
                } as Partial<IBatchOptions>);

                const stats2 = await processor2.processBatch(pattern, options2);

                expect(stats2.skipped).toBe(2);
                expect(stats2.successful).toBe(0);
            });
        });

        describe('directory filtering', () => {
            it('should only include files from includeDirectories', async () => {
                await createTestSrtFile(path.join(tempDir, 'include1', 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'include2', 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'exclude', 'file3.srt'));

                const pattern = path.join(tempDir, '**', '*.srt');
                const options = createDefaultOptions({
                    batch: { includeDirectories: ['include1', 'include2'] },
                } as Partial<IBatchOptions>);

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(2);
                expect(stats.successful).toBe(2);
            });

            it('should exclude files from excludeDirectories', async () => {
                await createTestSrtFile(path.join(tempDir, 'dir1', 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir2', 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'excluded', 'file3.srt'));

                const pattern = path.join(tempDir, '**', '*.srt');
                const options = createDefaultOptions({
                    batch: { excludeDirectories: ['excluded'] },
                } as Partial<IBatchOptions>);

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(2);
                expect(stats.successful).toBe(2);
            });

            it('should respect maxDepth option', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt')); // depth 0
                await createTestSrtFile(path.join(tempDir, 'level1', 'file2.srt')); // depth 1
                await createTestSrtFile(path.join(tempDir, 'level1', 'level2', 'file3.srt')); // depth 2
                await createTestSrtFile(path.join(tempDir, 'level1', 'level2', 'level3', 'file4.srt')); // depth 3

                const pattern = path.join(tempDir, '**', '*.srt');

                // Test with maxDepth: 2 - should only find files at depth 0, 1, 2
                const options = createDefaultOptions({
                    batch: { maxDepth: 2 },
                } as Partial<IBatchOptions>);

                const stats = await processor.processBatch(pattern, options);

                // Should find 3 files (file1, file2, file3) but not file4 (depth 3)
                expect(stats.total).toBe(3);
                expect(stats.successful).toBe(3);
            });
        });

        describe('preserve directory structure', () => {
            it('should preserve directory structure when enabled', async () => {
                // Save current working directory and change to tempDir
                const originalCwd = process.cwd();

                try {
                    // Resolve real path to handle symlinks (macOS /var -> /private/var)
                    const realTempDir = fs.realpathSync(tempDir);

                    process.chdir(realTempDir);

                    await createTestSrtFile(path.join(realTempDir, 'input', 'dir1', 'file1.srt'));
                    await createTestSrtFile(path.join(realTempDir, 'input', 'dir2', 'file2.srt'));

                    const outputDir = path.join(realTempDir, 'output');
                    const pattern = path.join(realTempDir, 'input', '**', '*.srt');
                    const options = createDefaultOptions({
                        common: { outputDir },
                        batch: { preserveStructure: true },
                    } as Partial<IBatchOptions>);

                    const stats = await processor.processBatch(pattern, options);

                    expect(stats.successful).toBe(2);

                    // The structure is preserved relative to cwd (which is now realTempDir)
                    // So the structure will be: outputDir/input/dir1 and outputDir/input/dir2
                    const expectedPath1 = path.join(outputDir, 'input', 'dir1');
                    const expectedPath2 = path.join(outputDir, 'input', 'dir2');

                    expect(fs.existsSync(expectedPath1)).toBe(true);
                    expect(fs.existsSync(expectedPath2)).toBe(true);
                } finally {
                    // Restore original working directory
                    process.chdir(originalCwd);
                }
            });

            it('should flatten output when preserveStructure is false', async () => {
                await createTestSrtFile(path.join(tempDir, 'input', 'dir1', 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'input', 'dir2', 'file2.srt'));

                const outputDir = path.join(tempDir, 'output');
                const pattern = path.join(tempDir, 'input', '**', '*.srt');
                const options = createDefaultOptions({
                    common: { outputDir },
                    batch: { preserveStructure: false },
                } as Partial<IBatchOptions>);

                const stats = await processor.processBatch(pattern, options);

                expect(stats.successful).toBe(2);

                // All files should be directly in output directory
                const outputFiles = await fs.promises.readdir(outputDir);

                expect(outputFiles.length).toBeGreaterThan(0);
            });
        });

        describe('statistics tracking', () => {
            it('should track statistics per directory', async () => {
                await createTestSrtFile(path.join(tempDir, 'dir1', 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir1', 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir2', 'file3.srt'));

                const pattern = path.join(tempDir, '**', '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                const dir1Path = path.join(tempDir, 'dir1');
                const dir2Path = path.join(tempDir, 'dir2');

                expect(stats.filesByDirectory[dir1Path]).toBeDefined();
                expect(stats.filesByDirectory[dir1Path].total).toBe(2);
                expect(stats.filesByDirectory[dir2Path]).toBeDefined();
                expect(stats.filesByDirectory[dir2Path].total).toBe(1);
            });

            it('should update directory stats for successful files', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'file2.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                const dirStats = stats.filesByDirectory[tempDir];

                expect(dirStats.successful).toBe(2);
                expect(dirStats.failed).toBe(0);
            });

            it('should update directory stats for failed files', async () => {
                // Create a file that will cause processing to fail by making it unreadable
                const invalidFile = path.join(tempDir, 'invalid.srt');

                await fs.promises.writeFile(invalidFile, 'invalid content', 'utf8');
                // Make the file unreadable to force a failure
                await fs.promises.chmod(invalidFile, 0o000);

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                try {
                    const stats = await processor.processBatch(pattern, options);

                    const dirStats = stats.filesByDirectory[tempDir];

                    expect(dirStats.failed).toBe(1);
                } finally {
                    // Restore permissions so cleanup can work
                    try {
                        await fs.promises.chmod(invalidFile, 0o644);
                    } catch {
                        // Ignore if file doesn't exist
                    }
                }
            });

            it('should update directory stats for skipped files', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));

                const outputDir = path.join(tempDir, 'output');
                const pattern = path.join(tempDir, '*.srt');

                // First run to create output
                const options1 = createDefaultOptions({ common: { outputDir } });

                await processor.processBatch(pattern, options1);

                // Second run with skipExisting
                const processor2 = new BatchProcessor();
                const options2 = createDefaultOptions({
                    common: { outputDir },
                    batch: { skipExisting: true },
                } as Partial<IBatchOptions>);

                const stats = await processor2.processBatch(pattern, options2);

                const dirStats = stats.filesByDirectory[tempDir];

                expect(dirStats.skipped).toBe(1);
            });
        });

        describe('edge cases', () => {
            it('should handle empty directories', async () => {
                await fs.promises.mkdir(path.join(tempDir, 'empty-dir'), { recursive: true });

                const pattern = path.join(tempDir, '**', '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(0);
            });

            it('should handle special characters in file names', async () => {
                await createTestSrtFile(path.join(tempDir, 'file (1).srt'));
                await createTestSrtFile(path.join(tempDir, 'file [2].srt'));
                await createTestSrtFile(path.join(tempDir, "file's 3.srt"));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(3);
                expect(stats.successful).toBe(3);
            });

            it('should handle very large batches', async () => {
                // Create 50 test files
                for (let i = 1; i <= 50; i++) {
                    await createTestSrtFile(path.join(tempDir, `file${i}.srt`));
                }

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    batch: { parallel: true, chunkSize: 10 },
                } as Partial<IBatchOptions>);

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(50);
                expect(stats.successful).toBe(50);
            });

            it('should handle files without output directory', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options: IBatchOptions = {
                    common: {},
                    batch: {
                        recursive: true,
                        parallel: false,
                        skipExisting: false,
                    },
                };

                const stats = await processor.processBatch(pattern, options);

                expect(stats.successful).toBe(1);
            });

            it('should handle Unicode filenames', async () => {
                await createTestSrtFile(path.join(tempDir, 'файл-тест.srt'));
                await createTestSrtFile(path.join(tempDir, '测试文件.srt'));
                await createTestSrtFile(path.join(tempDir, 'ملف-اختبار.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(3);
                expect(stats.successful).toBe(3);
            });

            it('should handle deeply nested directory structures', async () => {
                const deepPath = path.join(tempDir, 'a', 'b', 'c', 'd', 'e', 'f');

                await createTestSrtFile(path.join(deepPath, 'file.srt'));

                const pattern = path.join(tempDir, '**', '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(1);
                expect(stats.successful).toBe(1);
            });

            it('should handle pattern with no matches gracefully', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.txt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(0);
                expect(console.log).toHaveBeenCalledWith('⚠️ No files found matching pattern:', pattern);
            });
        });

        describe('resource cleanup', () => {
            it('should stop progress bars on successful completion', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.successful).toBe(1);
                // Progress bars should be stopped (no way to directly test this,
                // but we can verify the process completed without hanging)
            });

            it('should stop progress bars on error', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    common: { failFast: true },
                });

                // Create an invalid file to cause an error
                await fs.promises.writeFile(path.join(tempDir, 'invalid.srt'), 'invalid', 'utf8');

                try {
                    await processor.processBatch(pattern, options);
                } catch {
                    // Expected to throw
                }

                // Progress bars should be stopped even on error
                // (verified by test completing without hanging)
            });
        });

        describe('progress tracking', () => {
            it('should track progress for single directory', async () => {
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'file3.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.total).toBe(3);
                expect(stats.successful).toBe(3);
            });

            it('should track progress across multiple directories', async () => {
                await createTestSrtFile(path.join(tempDir, 'dir1', 'file1.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir2', 'file2.srt'));
                await createTestSrtFile(path.join(tempDir, 'dir3', 'file3.srt'));

                const pattern = path.join(tempDir, '**', '*.srt');
                const options = createDefaultOptions();

                const stats = await processor.processBatch(pattern, options);

                expect(stats.directoriesProcessed).toBe(3);
            });
        });

        describe('output file naming', () => {
            it('should add .subzilla suffix to output filenames', async () => {
                await createTestSrtFile(path.join(tempDir, 'movie.srt'));

                const outputDir = path.join(tempDir, 'output');
                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    common: { outputDir },
                });

                await processor.processBatch(pattern, options);

                const outputFiles = await fs.promises.readdir(outputDir);
                const subzillaFiles = outputFiles.filter((f) => f.includes('.subzilla'));

                expect(subzillaFiles.length).toBeGreaterThan(0);
            });
        });

        describe('mixed scenarios', () => {
            it('should handle mix of successful, failed, and skipped files', async () => {
                // Create various files
                await createTestSrtFile(path.join(tempDir, 'valid1.srt'));
                await createTestSrtFile(path.join(tempDir, 'valid2.srt'));
                await fs.promises.writeFile(path.join(tempDir, 'invalid.srt'), 'invalid content', 'utf8');

                const outputDir = path.join(tempDir, 'output');
                const pattern = path.join(tempDir, '*.srt');

                // First run
                const options1 = createDefaultOptions({ common: { outputDir } });

                await processor.processBatch(pattern, options1);

                // Second run with skipExisting
                const processor2 = new BatchProcessor();
                const options2 = createDefaultOptions({
                    common: { outputDir },
                    batch: { skipExisting: true },
                } as Partial<IBatchOptions>);

                const stats = await processor2.processBatch(pattern, options2);

                expect(stats.total).toBe(3);
                expect(stats.successful + stats.failed + stats.skipped).toBe(stats.total);
            });

            it('should handle parallel processing with errors', async () => {
                await createTestSrtFile(path.join(tempDir, 'valid1.srt'));
                await createTestSrtFile(path.join(tempDir, 'valid2.srt'));

                // Create a file that will cause processing to fail by making it unreadable
                const unreadableFile = path.join(tempDir, 'unreadable.srt');

                await createTestSrtFile(unreadableFile);
                // Make the file unreadable to force a failure
                await fs.promises.chmod(unreadableFile, 0o000);

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    batch: { parallel: true, chunkSize: 2 },
                } as Partial<IBatchOptions>);

                try {
                    const stats = await processor.processBatch(pattern, options);

                    expect(stats.total).toBe(3);
                    expect(stats.successful).toBeGreaterThan(0);
                    expect(stats.failed).toBeGreaterThan(0);
                } finally {
                    // Restore permissions so cleanup can work
                    try {
                        await fs.promises.chmod(unreadableFile, 0o644);
                    } catch {
                        // Ignore if file doesn't exist
                    }
                }
            });

            it('should handle retries with eventual success', async () => {
                // Create a valid file that might initially fail
                await createTestSrtFile(path.join(tempDir, 'file1.srt'));

                const pattern = path.join(tempDir, '*.srt');
                const options = createDefaultOptions({
                    common: { retryCount: 2, retryDelay: 10 },
                });

                const stats = await processor.processBatch(pattern, options);

                expect(stats.successful).toBe(1);
            });
        });
    });
});
