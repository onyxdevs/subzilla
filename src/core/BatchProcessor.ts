import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import { SingleBar, MultiBar, Presets } from 'cli-progress';
import { SubtitleProcessor } from './SubtitleProcessor';
import { IBatchOptions, IBatchStats } from '../types/core/batch';

export class BatchProcessor {
    private processor: SubtitleProcessor;
    private multiBar: MultiBar;
    private mainProgressBar!: SingleBar;
    private directoryBars: Map<string, SingleBar>;
    private startTime: number = 0;
    private stats: IBatchStats;

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
            if (options.outputDir) {
                await fs.mkdir(options.outputDir, { recursive: true });
            }

            // Group files by directory
            const filesByDir = this.groupFilesByDirectory(files);

            this.stats.directoriesProcessed = Object.keys(filesByDir).length;

            // Initialize main progress bar
            this.mainProgressBar = this.multiBar.create(files.length, 0, {
                title: 'Total Progress',
            });

            // Process directories
            if (options.parallel) {
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
        const files = await glob(pattern, {
            nodir: true,
            dot: false,
            follow: true,
            maxDepth: options.maxDepth,
        });

        return files.filter(file => {
            const dirPath = path.dirname(file);

            // Check include directories
            if (options.includeDirectories?.length) {
                if (!options.includeDirectories.some(dir => dirPath.includes(dir))) {
                    return false;
                }
            }

            // Check exclude directories
            if (options.excludeDirectories?.length) {
                if (options.excludeDirectories.some(dir => dirPath.includes(dir))) {
                    return false;
                }
            }

            return true;
        });
    }

    private countDirectories(files: string[]): number {
        return new Set(files.map(file => path.dirname(file))).size;
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
        const chunks = this.chunkArray(directories, 3); // Process 3 directories at a time

        for (const chunk of chunks) {
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
        // Create directory progress bar
        const dirBar = this.multiBar.create(files.length, 0, {
            title: `Processing ${path.basename(dir)}`,
        });

        this.directoryBars.set(dir, dirBar);

        // Create output directory structure if needed
        if (options.preserveStructure && options.outputDir) {
            const relativePath = path.relative(process.cwd(), dir);
            const outputPath = path.join(options.outputDir, relativePath);

            await fs.mkdir(outputPath, { recursive: true });
        }

        // Process files
        if (options.parallel) {
            const chunks = this.chunkArray(files, 5);

            for (const chunk of chunks) {
                await Promise.all(chunk.map(file => this.processFile(file, dir, options)));
            }
        } else {
            for (const file of files) {
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

        try {
            if (options.skipExisting && outputPath && (await this.fileExists(outputPath))) {
                dirStats.skipped++;
                this.stats.skipped++;

                return;
            }

            await this.processor.processFile(file, outputPath, {
                strip: options.strip,
                backupOriginal: options.backupOriginal,
            });
            dirStats.successful++;
            this.stats.successful++;
        } catch (error) {
            dirStats.failed++;
            this.stats.failed++;
            this.stats.errors.push({
                file,
                error: (error as Error).message,
            });
        } finally {
            this.mainProgressBar.increment();
            this.directoryBars.get(dir)?.increment();
        }
    }

    private getOutputPath(file: string, dir: string, options: IBatchOptions): string | undefined {
        if (!options.outputDir) return undefined;

        const fileName = path.basename(file, path.extname(file)) + '.utf8' + path.extname(file);

        if (options.preserveStructure) {
            const relativePath = path.relative(process.cwd(), dir);

            return path.join(options.outputDir, relativePath, fileName);
        }

        return path.join(options.outputDir, fileName);
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
        Object.entries(this.stats.filesByDirectory).forEach(([dir, stats]) => {
            console.log(`\n${dir}:`);
            console.log(`  Total: ${stats.total}`);
            console.log(`  ✅ Success: ${stats.successful}`);
            console.log(`  ❌ Failed: ${stats.failed}`);
            console.log(`  ⏭️  Skipped: ${stats.skipped}`);
        });

        if (this.stats.errors.length > 0) {
            console.log('\n❌ Errors:');
            console.log('━━━━━━━━━');
            this.stats.errors.forEach(({ file, error }) => {
                console.log(`${file}: ${error}`);
            });
        }
    }
}
