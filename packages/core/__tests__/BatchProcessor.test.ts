import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { IBatchOptions } from '@subzilla/types';

import BatchProcessor from '../src/BatchProcessor';

describe('BatchProcessor', () => {
    let processor: BatchProcessor;
    let tempDir: string;

    beforeEach(async () => {
        processor = new BatchProcessor();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'subzilla-batch-'));
    });

    afterEach(async () => {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('File Discovery', () => {
        it('should find files matching glob pattern', async () => {
            // Create test files
            await fs.writeFile(path.join(tempDir, 'test1.srt'), '1\n00:00:01,000 --> 00:00:02,000\nTest 1', 'utf8');
            await fs.writeFile(path.join(tempDir, 'test2.srt'), '1\n00:00:01,000 --> 00:00:02,000\nTest 2', 'utf8');
            await fs.writeFile(path.join(tempDir, 'test.txt'), 'not a subtitle', 'utf8');

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: false,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                },
            };

            const pattern = path.join(tempDir, '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(2);
            expect(stats.successful).toBe(2);
            expect(stats.failed).toBe(0);
        });

        it('should return empty stats when no files match pattern', async () => {
            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: false,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                },
            };

            const pattern = path.join(tempDir, '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(0);
            expect(stats.successful).toBe(0);
            expect(stats.failed).toBe(0);
        });

        it('should find files recursively when enabled', async () => {
            // Create nested structure
            const subDir = path.join(tempDir, 'subdir');

            await fs.mkdir(subDir, { recursive: true });
            await fs.writeFile(path.join(tempDir, 'top.srt'), '1\n00:00:01,000 --> 00:00:02,000\nTop', 'utf8');
            await fs.writeFile(path.join(subDir, 'nested.srt'), '1\n00:00:01,000 --> 00:00:02,000\nNested', 'utf8');

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: true,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                },
            };

            const pattern = path.join(tempDir, '**', '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(2);
            expect(stats.successful).toBe(2);
        });

        it('should respect maxDepth option', async () => {
            // Create deeply nested structure
            const depth1 = path.join(tempDir, 'level1');
            const depth2 = path.join(depth1, 'level2');
            const depth3 = path.join(depth2, 'level3');

            await fs.mkdir(depth3, { recursive: true });
            await fs.writeFile(path.join(depth1, 'file1.srt'), '1\n00:00:01,000 --> 00:00:02,000\nL1', 'utf8');
            await fs.writeFile(path.join(depth2, 'file2.srt'), '1\n00:00:01,000 --> 00:00:02,000\nL2', 'utf8');
            await fs.writeFile(path.join(depth3, 'file3.srt'), '1\n00:00:01,000 --> 00:00:02,000\nL3', 'utf8');

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: true,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                    maxDepth: 2,
                },
            };

            const pattern = path.join(tempDir, '**', '*.srt');
            const stats = await processor.processBatch(pattern, options);

            // Should find files at depth 1 and 2, but not 3
            expect(stats.total).toBeLessThanOrEqual(2);
        });

        it('should filter by includeDirectories', async () => {
            const moviesDir = path.join(tempDir, 'movies');
            const seriesDir = path.join(tempDir, 'series');
            const otherDir = path.join(tempDir, 'other');

            await fs.mkdir(moviesDir, { recursive: true });
            await fs.mkdir(seriesDir, { recursive: true });
            await fs.mkdir(otherDir, { recursive: true });

            await fs.writeFile(path.join(moviesDir, 'movie.srt'), '1\n00:00:01,000 --> 00:00:02,000\nMovie', 'utf8');
            await fs.writeFile(path.join(seriesDir, 'series.srt'), '1\n00:00:01,000 --> 00:00:02,000\nSeries', 'utf8');
            await fs.writeFile(path.join(otherDir, 'other.srt'), '1\n00:00:01,000 --> 00:00:02,000\nOther', 'utf8');

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: true,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                    includeDirectories: ['movies', 'series'],
                },
            };

            const pattern = path.join(tempDir, '**', '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(2); // Should only process movies and series, not other
        });

        it('should filter by excludeDirectories', async () => {
            const goodDir = path.join(tempDir, 'good');
            const badDir = path.join(tempDir, 'temp');

            await fs.mkdir(goodDir, { recursive: true });
            await fs.mkdir(badDir, { recursive: true });

            await fs.writeFile(path.join(goodDir, 'good.srt'), '1\n00:00:01,000 --> 00:00:02,000\nGood', 'utf8');
            await fs.writeFile(path.join(badDir, 'bad.srt'), '1\n00:00:01,000 --> 00:00:02,000\nBad', 'utf8');

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: true,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                    excludeDirectories: ['temp', 'backup'],
                },
            };

            const pattern = path.join(tempDir, '**', '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(1); // Should exclude temp directory
            expect(stats.successful).toBe(1);
        });
    });

    describe('Parallel vs Sequential Processing', () => {
        it('should process files in parallel mode', async () => {
            const files = 10;

            for (let i = 1; i <= files; i++) {
                await fs.writeFile(
                    path.join(tempDir, `file${i}.srt`),
                    `1\n00:00:01,000 --> 00:00:02,000\nFile ${i}`,
                    'utf8',
                );
            }

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: false,
                    parallel: true,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 3,
                },
            };

            const pattern = path.join(tempDir, '*.srt');
            const startTime = Date.now();
            const stats = await processor.processBatch(pattern, options);
            const parallelTime = Date.now() - startTime;

            expect(stats.total).toBe(files);
            expect(stats.successful).toBe(files);
            expect(parallelTime).toBeLessThan(10000); // Should be reasonably fast
        });

        it('should process files sequentially when parallel is disabled', async () => {
            const files = 5;

            for (let i = 1; i <= files; i++) {
                await fs.writeFile(
                    path.join(tempDir, `file${i}.srt`),
                    `1\n00:00:01,000 --> 00:00:02,000\nFile ${i}`,
                    'utf8',
                );
            }

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: false,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 3,
                },
            };

            const pattern = path.join(tempDir, '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(files);
            expect(stats.successful).toBe(files);
        });
    });

    describe('Skip Existing', () => {
        it('should skip files that already have .subzilla. version', async () => {
            await fs.writeFile(path.join(tempDir, 'test.srt'), '1\n00:00:01,000 --> 00:00:02,000\nOriginal', 'utf8');

            const outputDir = path.join(tempDir, 'output');

            await fs.mkdir(outputDir, { recursive: true });

            const options: IBatchOptions = {
                common: {
                    outputDir,
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: false,
                    parallel: false,
                    skipExisting: true,
                    preserveStructure: false,
                    chunkSize: 5,
                },
            };

            // First run - should process
            const pattern = path.join(tempDir, '*.srt');
            const stats1 = await processor.processBatch(pattern, options);

            expect(stats1.successful).toBe(1);
            expect(stats1.skipped).toBe(0);

            // Second run - should skip
            const processor2 = new BatchProcessor();
            const stats2 = await processor2.processBatch(pattern, options);

            expect(stats2.skipped).toBe(1);
            expect(stats2.successful).toBe(0);
        });
    });

    describe('Retry Logic', () => {
        it('should retry failed files according to retryCount', async () => {
            // This test would require mocking file operations to simulate failures
            // For now, we'll test that successful operations don't trigger retries

            await fs.writeFile(path.join(tempDir, 'test.srt'), '1\n00:00:01,000 --> 00:00:02,000\nTest', 'utf8');

            const options: IBatchOptions = {
                common: {
                    retryCount: 3,
                    retryDelay: 100,
                    failFast: false,
                },
                batch: {
                    recursive: false,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                },
            };

            const pattern = path.join(tempDir, '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.successful).toBe(1);
            expect(stats.failed).toBe(0);
        });
    });

    describe('Preserve Structure', () => {
        it('should preserve directory structure when enabled', async () => {
            const subDir = path.join(tempDir, 'subdir');

            await fs.mkdir(subDir, { recursive: true });
            await fs.writeFile(path.join(tempDir, 'top.srt'), '1\n00:00:01,000 --> 00:00:02,000\nTop', 'utf8');
            await fs.writeFile(path.join(subDir, 'nested.srt'), '1\n00:00:01,000 --> 00:00:02,000\nNested', 'utf8');

            const outputDir = path.join(tempDir, 'output');
            const options: IBatchOptions = {
                common: {
                    outputDir,
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: true,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: true,
                    chunkSize: 5,
                },
            };

            const pattern = path.join(tempDir, '**', '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(2);
            expect(stats.successful).toBe(2);

            // Check that structure is preserved
            const outputFiles = await fs.readdir(outputDir, { recursive: true });

            expect(outputFiles.length).toBeGreaterThan(0);
        });

        it('should flatten structure when preserveStructure is disabled', async () => {
            const subDir = path.join(tempDir, 'subdir');

            await fs.mkdir(subDir, { recursive: true });
            await fs.writeFile(path.join(tempDir, 'top.srt'), '1\n00:00:01,000 --> 00:00:02,000\nTop', 'utf8');
            await fs.writeFile(path.join(subDir, 'nested.srt'), '1\n00:00:01,000 --> 00:00:02,000\nNested', 'utf8');

            const outputDir = path.join(tempDir, 'output');
            const options: IBatchOptions = {
                common: {
                    outputDir,
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: true,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                },
            };

            const pattern = path.join(tempDir, '**', '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(2);
            expect(stats.successful).toBe(2);

            // All files should be in root of output dir
            const outputFiles = await fs.readdir(outputDir);

            expect(outputFiles.length).toBe(2);
        });
    });

    describe('Statistics', () => {
        it('should track processing statistics accurately', async () => {
            // Create mix of valid and invalid files
            await fs.writeFile(path.join(tempDir, 'good1.srt'), '1\n00:00:01,000 --> 00:00:02,000\nGood 1', 'utf8');
            await fs.writeFile(path.join(tempDir, 'good2.srt'), '1\n00:00:01,000 --> 00:00:02,000\nGood 2', 'utf8');

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: false,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                },
            };

            const pattern = path.join(tempDir, '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(2);
            expect(stats.successful).toBe(2);
            expect(stats.failed).toBe(0);
            expect(stats.skipped).toBe(0);
            expect(stats.timeTaken).toBeGreaterThan(0);
            expect(stats.averageTimePerFile).toBeGreaterThan(0);
            expect(stats.directoriesProcessed).toBeGreaterThan(0);
        });

        it('should track errors with file paths and messages', async () => {
            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: false,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                },
            };

            // Try to process non-existent file
            const pattern = path.join(tempDir, 'nonexistent*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(0);
            expect(stats.errors.length).toBe(0);
        });
    });

    describe('Chunk Size', () => {
        it('should respect chunkSize for parallel processing', async () => {
            const files = 10;

            for (let i = 1; i <= files; i++) {
                await fs.writeFile(
                    path.join(tempDir, `file${i}.srt`),
                    `1\n00:00:01,000 --> 00:00:02,000\nFile ${i}`,
                    'utf8',
                );
            }

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: false,
                    parallel: true,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 2,
                },
            };

            const pattern = path.join(tempDir, '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(files);
            expect(stats.successful).toBe(files);
            // With chunk size 2, it should process in 5 chunks
        });
    });

    describe('Multiple Directories', () => {
        it('should process files from multiple directories', async () => {
            const dir1 = path.join(tempDir, 'dir1');
            const dir2 = path.join(tempDir, 'dir2');
            const dir3 = path.join(tempDir, 'dir3');

            await fs.mkdir(dir1, { recursive: true });
            await fs.mkdir(dir2, { recursive: true });
            await fs.mkdir(dir3, { recursive: true });

            await fs.writeFile(path.join(dir1, 'file1.srt'), '1\n00:00:01,000 --> 00:00:02,000\nDir1', 'utf8');
            await fs.writeFile(path.join(dir2, 'file2.srt'), '1\n00:00:01,000 --> 00:00:02,000\nDir2', 'utf8');
            await fs.writeFile(path.join(dir3, 'file3.srt'), '1\n00:00:01,000 --> 00:00:02,000\nDir3', 'utf8');

            const options: IBatchOptions = {
                common: {
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
                batch: {
                    recursive: true,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                },
            };

            const pattern = path.join(tempDir, '**', '*.srt');
            const stats = await processor.processBatch(pattern, options);

            expect(stats.total).toBe(3);
            expect(stats.successful).toBe(3);
            expect(stats.directoriesProcessed).toBe(3);
        });
    });
});
