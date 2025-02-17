import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import { SingleBar, MultiBar, Presets } from 'cli-progress';

import { IBatchOptions } from '@subzilla/types/core/options';
import { IBatchStats } from '@subzilla/types/core/batch';
import SubtitleProcessor from './SubtitleProcessor';

export default class BatchProcessor {
    private processor: SubtitleProcessor;
    private multiBar: MultiBar;
    private mainProgressBar!: SingleBar;
    private directoryBars: Map<string, SingleBar>;
    private startTime: number = 0;
    private stats: IBatchStats;
    private shouldStop: boolean = false;

    constructor() {
        this.processor = new SubtitleProcessor();
        this.multiBar = new MultiBar(
            {
                format: '{bar} {percentage}% | {value}/{total} | {title}',
                hideCursor: true,
                clearOnComplete: false,
            },
            Presets.shades_classic
        );

        this.directoryBars = new Map();
        this.stats = this.initializeStats();
    }

    private initializeStats(): IBatchStats {
        return {
            total: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            timeTaken: 0,
            averageTimePerFile: 0,
            directoriesProcessed: 0,
            filesByDirectory: {},
            startTime: Date.now(),
            endTime: 0,
        };
    }

    public async processBatch(pattern: string, options: IBatchOptions): Promise<IBatchStats> {
        try {
            this.startTime = Date.now();

            // Find matching files
            const files = await this.findFiles(pattern, options);

            if (files.length === 0) {
                console.log('⚠️ No files found matching pattern:', pattern);

                return this.stats;
            }

            this.stats.total = files.length;
            console.log(
                `🔍 Found ${files.length} files in ${this.countDirectories(files)} directories...`
            );

            // Create output directory if specified
            if (options.common.outputDir) {
                await fs.mkdir(options.common.outputDir, { recursive: true });
            }

            // Group files by directory
            const filesByDir = this.groupFilesByDirectory(files);

            this.stats.directoriesProcessed = Object.keys(filesByDir).length;

            // Initialize main progress bar
            this.mainProgressBar = this.multiBar.create(files.length, 0, {
                title: 'Total Progress',
            });

            // Process directories
            if (options.batch.parallel) {
                await this.processDirectoriesParallel(filesByDir, options);
            } else {
                await this.processDirectoriesSequential(filesByDir, options);
            }

            // Finalize statistics
            this.stats.timeTaken = (Date.now() - this.startTime) / 1000;
            this.stats.averageTimePerFile =
                this.stats.timeTaken / (this.stats.successful + this.stats.failed);

            // Stop progress bars
            this.multiBar.stop();

            // Print summary
            this.printSummary();

            return this.stats;
        } catch (error) {
            this.multiBar.stop();
            throw error;
        }
    }

    private async findFiles(pattern: string, options: IBatchOptions): Promise<string[]> {
        console.info(`🔍 Finding files: ${pattern}`);

        const files = await glob(pattern, {
            nodir: true,
            dot: false,
            follow: true,
            maxDepth: options.batch.maxDepth,
        });

        return files.filter((file) => {
            const dirPath = path.dirname(file);

            // Check include directories
            if (options.batch.includeDirectories?.length) {
                if (!options.batch.includeDirectories.some((dir) => dirPath.includes(dir))) {
                    return false;
                }
            }

            // Check exclude directories
            if (options.batch.excludeDirectories?.length) {
                if (options.batch.excludeDirectories.some((dir) => dirPath.includes(dir))) {
                    return false;
                }
            }

            return true;
        });
    }

    private countDirectories(files: string[]): number {
        return new Set(files.map((file) => path.dirname(file))).size;
    }

    private groupFilesByDirectory(files: string[]): Record<string, string[]> {
        return files.reduce(
            (acc, file) => {
                const dir = path.dirname(file);

                acc[dir] = acc[dir] || [];
                acc[dir].push(file);
                this.stats.filesByDirectory[dir] = {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    skipped: 0,
                };

                return acc;
            },
            {} as Record<string, string[]>
        );
    }

    private async processDirectoriesParallel(
        filesByDir: Record<string, string[]>,
        options: IBatchOptions
    ): Promise<void> {
        const directories = Object.entries(filesByDir);
        const chunks = this.chunkArray(directories, options.batch.chunkSize || 3); // Use configured chunk size

        for (const chunk of chunks) {
            if (this.shouldStop) break;
            await Promise.all(
                chunk.map(([dir, files]) => this.processDirectory(dir, files, options))
            );
        }
    }

    private async processDirectoriesSequential(
        filesByDir: Record<string, string[]>,
        options: IBatchOptions
    ): Promise<void> {
        for (const [dir, files] of Object.entries(filesByDir)) {
            await this.processDirectory(dir, files, options);
        }
    }

    private async processDirectory(
        dir: string,
        files: string[],
        options: IBatchOptions
    ): Promise<void> {
        if (this.shouldStop) return;

        // Create directory progress bar
        const dirBar = this.multiBar.create(files.length, 0, {
            title: `Processing ${path.basename(dir)}`,
        });

        this.directoryBars.set(dir, dirBar);

        // Create output directory structure if needed
        if (options.batch.preserveStructure && options.common.outputDir) {
            const relativePath = path.relative(process.cwd(), dir);
            const outputPath = path.join(options.common.outputDir, relativePath);

            await fs.mkdir(outputPath, { recursive: true });
        }

        // Process files
        if (options.batch.parallel) {
            const chunks = this.chunkArray(files, options.batch.chunkSize || 5);

            for (const chunk of chunks) {
                if (this.shouldStop) break;
                await Promise.all(chunk.map((file) => this.processFile(file, dir, options)));
            }
        } else {
            for (const file of files) {
                if (this.shouldStop) break;
                await this.processFile(file, dir, options);
            }
        }

        // Remove directory progress bar
        this.directoryBars.delete(dir);
    }

    private async processFile(file: string, dir: string, options: IBatchOptions): Promise<void> {
        const outputPath = this.getOutputPath(file, dir, options);
        const dirStats = this.stats.filesByDirectory[dir];

        dirStats.total++;

        let attempts = 0;
        const maxAttempts = (options.common.retryCount || 0) + 1;
        const retryDelay = options.common.retryDelay || 1000;

        while (attempts < maxAttempts) {
            if (this.shouldStop) return;

            try {
                if (
                    options.batch.skipExisting &&
                    outputPath &&
                    (await this.fileExists(outputPath))
                ) {
                    dirStats.skipped++;
                    this.stats.skipped++;

                    return;
                }

                await this.processor.processFile(file, outputPath, options.common);
                dirStats.successful++;
                this.stats.successful++;

                break;
            } catch (error) {
                attempts++;

                if (attempts < maxAttempts) {
                    // Log retry attempt
                    console.log(`🔄 Retrying ${file} (attempt ${attempts}/${maxAttempts - 1})...`);
                    await this.delay(retryDelay);
                    continue;
                }

                dirStats.failed++;
                this.stats.failed++;
                this.stats.errors.push({
                    file,
                    error: (error as Error).message,
                });

                if (options.common.failFast) {
                    this.shouldStop = true;
                    throw new Error(`Failed to process ${file}: ${(error as Error).message}`);
                }
            } finally {
                this.mainProgressBar.increment();
                this.directoryBars.get(dir)?.increment();
            }
        }
    }

    private getOutputPath(file: string, dir: string, options: IBatchOptions): string | undefined {
        if (!options.common.outputDir) return undefined;

        const fileName = path.basename(file, path.extname(file)) + '.subzilla' + path.extname(file);

        if (options.batch.preserveStructure) {
            const relativePath = path.relative(process.cwd(), dir);

            return path.join(options.common.outputDir, relativePath, fileName);
        }

        return path.join(options.common.outputDir, fileName);
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);

            return true;
        } catch {
            return false;
        }
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];

        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }

        return chunks;
    }

    private async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private printSummary(): void {
        console.log('\n📊 Batch Processing Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Total files processed: ${this.stats.total}`);
        console.log(`Directories processed: ${this.stats.directoriesProcessed}`);
        console.log(`✅ Successfully converted: ${this.stats.successful}`);
        console.log(`❌ Failed: ${this.stats.failed}`);
        console.log(`⏭️  Skipped: ${this.stats.skipped}`);
        console.log(`⏱️  Total time: ${this.stats.timeTaken.toFixed(2)}s`);
        console.log(`⚡ Average time per file: ${this.stats.averageTimePerFile.toFixed(2)}s`);

        console.log('\n📂 Directory Statistics:');
        console.log('━━━━━━━━━━━━━━━━━━━━');
        // Object.entries(this.stats.filesByDirectory).forEach(([dir, stats]) => {
        //     console.log(`\n${dir}:`);
        //     console.log(`  Total: ${stats.total}`);
        //     console.log(`  ✅ Success: ${stats.successful}`);
        //     console.log(`  ❌ Failed: ${stats.failed}`);
        //     console.log(`  ⏭️  Skipped: ${stats.skipped}`);
        // });

        if (this.stats.errors.length > 0) {
            console.log('\n❌ Errors:');
            console.log('━━━━━━━━━');
            this.stats.errors.forEach(({ file, error }) => {
                console.log(`${file}: ${error}`);
            });
        }
    }
}
