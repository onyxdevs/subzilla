import fs from 'fs/promises';
import path from 'path';

import { SingleBar, Presets } from 'cli-progress';
import { glob } from 'glob';

import { IBatchOptions, IBatchStats } from '@subzilla/types';

import SubtitleProcessor from './SubtitleProcessor';

export default class BatchProcessor {
    private processor: SubtitleProcessor;
    private progressBar: SingleBar | null = null;
    private startTime: number = 0;
    private stats: IBatchStats;
    private shouldStop: boolean = false;
    private currentFile: string = '';

    constructor() {
        this.processor = new SubtitleProcessor();
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
            const dirCount = this.countDirectories(files);

            console.log(`🔍 Found ${files.length} files in ${dirCount} directories\n`);

            // Create output directory if specified
            if (options.common.outputDir) {
                await fs.mkdir(options.common.outputDir, { recursive: true });
            }

            // Group files by directory
            const filesByDir = this.groupFilesByDirectory(files);

            this.stats.directoriesProcessed = Object.keys(filesByDir).length;

            // Initialize progress bar
            this.progressBar = new SingleBar(
                {
                    format: '  {bar} {percentage}% | {value}/{total} files | {status}',
                    hideCursor: true,
                    clearOnComplete: false,
                    barCompleteChar: '█',
                    barIncompleteChar: '░',
                },
                Presets.shades_classic,
            );

            this.progressBar.start(files.length, 0, { status: 'Starting...' });

            // Process directories
            if (options.batch.parallel) {
                await this.processDirectoriesParallel(filesByDir, options);
            } else {
                await this.processDirectoriesSequential(filesByDir, options);
            }

            // Finalize statistics
            this.stats.timeTaken = (Date.now() - this.startTime) / 1000;
            this.stats.averageTimePerFile = this.stats.timeTaken / (this.stats.successful + this.stats.failed) || 0;

            // Stop progress bar
            this.progressBar.update({ status: 'Complete!' });
            this.progressBar.stop();

            // Print summary
            this.printSummary();

            return this.stats;
        } catch (error) {
            this.progressBar?.stop();
            throw error;
        }
    }

    private async findFiles(pattern: string, options: IBatchOptions): Promise<string[]> {
        console.info(`🔍 Finding files: ${pattern}`);

        const globOptions: Parameters<typeof glob>[1] = {
            nodir: true,
            dot: false,
            follow: true,
        };

        // Note: We don't use glob's maxDepth option as it may not work correctly with ** patterns
        // Instead, we filter manually after getting all files

        const files = await glob(pattern, globOptions);

        return files
            .map((file) => String(file))
            .filter((file) => {
                // Apply maxDepth filtering manually if needed
                // Note: glob's maxDepth may not work correctly with ** patterns, so we filter manually
                if (options.batch.maxDepth !== undefined) {
                    // Calculate depth relative to the pattern's base directory
                    // Pattern is like "tempDir/**/*.srt", base is "tempDir"
                    // Extract base directory: everything before the first "**"
                    const doubleStarIndex = pattern.indexOf('**');
                    let patternBase: string;

                    if (doubleStarIndex > 0) {
                        const basePart = pattern.substring(0, doubleStarIndex);

                        // Remove trailing slash/separator if present
                        patternBase = basePart.replace(/[/\\]$/, '') || path.dirname(pattern);
                    } else {
                        patternBase = path.dirname(pattern);
                    }

                    // Normalize paths to handle absolute/relative differences
                    const normalizedBase = path.resolve(patternBase);
                    const normalizedFile = path.resolve(file);
                    const relativePath = path.relative(normalizedBase, normalizedFile);

                    // Skip if relative path is empty or just ".." (file is outside base)
                    if (!relativePath || relativePath.startsWith('..')) {
                        return false;
                    }

                    // Depth is the number of directory separators in the relative path
                    // For "level1/file2.srt", depth is 1; for "file1.srt", depth is 0
                    const pathParts = relativePath
                        .split(path.sep)
                        .filter((segment) => segment !== '' && segment !== '.');
                    const depth = pathParts.length > 0 ? pathParts.length - 1 : 0; // -1 for filename

                    if (depth > options.batch.maxDepth) {
                        return false;
                    }
                }

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
            {} as Record<string, string[]>,
        );
    }

    private async processDirectoriesParallel(
        filesByDir: Record<string, string[]>,
        options: IBatchOptions,
    ): Promise<void> {
        const directories = Object.entries(filesByDir);
        const chunks = this.chunkArray(directories, options.batch.chunkSize || 3);

        for (const chunk of chunks) {
            if (this.shouldStop) break;
            await Promise.all(chunk.map(([dir, files]) => this.processDirectory(dir, files, options)));
        }
    }

    private async processDirectoriesSequential(
        filesByDir: Record<string, string[]>,
        options: IBatchOptions,
    ): Promise<void> {
        for (const [dir, files] of Object.entries(filesByDir)) {
            await this.processDirectory(dir, files, options);
        }
    }

    private async processDirectory(dir: string, files: string[], options: IBatchOptions): Promise<void> {
        if (this.shouldStop) return;

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
    }

    private async processFile(file: string, dir: string, options: IBatchOptions): Promise<void> {
        const outputPath = this.getOutputPath(file, dir, options);
        const dirStats = this.stats.filesByDirectory[dir];
        const fileName = path.basename(file);

        dirStats.total++;
        this.currentFile = fileName;

        // Update progress bar with current file
        this.progressBar?.update({ status: this.truncateFileName(fileName, 40) });

        let attempts = 0;
        const retryCount = options.common.retryCount || 0;
        const maxAttempts = retryCount + 1;
        const retryDelay = options.common.retryDelay || 1000;

        try {
            while (attempts < maxAttempts) {
                if (this.shouldStop) return;

                try {
                    if (options.batch.skipExisting && outputPath && (await this.fileExists(outputPath))) {
                        dirStats.skipped++;
                        this.stats.skipped++;

                        return;
                    }

                    await this.processor.processFile(file, outputPath, options.common);
                    dirStats.successful++;
                    this.stats.successful++;

                    return;
                } catch (error) {
                    attempts++;

                    if (attempts < maxAttempts) {
                        this.progressBar?.update({ status: `Retrying ${fileName} (${attempts}/${retryCount})` });
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
                }
            }
        } finally {
            this.progressBar?.increment();
        }
    }

    private truncateFileName(fileName: string, maxLength: number): string {
        if (fileName.length <= maxLength) return fileName;

        const ext = path.extname(fileName);
        const name = path.basename(fileName, ext);
        const availableLength = maxLength - ext.length - 3; // 3 for "..."

        return name.substring(0, availableLength) + '...' + ext;
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
        console.log('\n');
        console.log('📊 Batch Processing Summary');
        console.log('───────────────────────────');
        console.log(`   Total:     ${this.stats.total} files in ${this.stats.directoriesProcessed} directories`);
        console.log(`   ✓ Success: ${this.stats.successful}`);

        if (this.stats.failed > 0) {
            console.log(`   ✗ Failed:  ${this.stats.failed}`);
        }

        if (this.stats.skipped > 0) {
            console.log(`   ⊘ Skipped: ${this.stats.skipped}`);
        }

        console.log(
            `   ⏱ Time:    ${this.stats.timeTaken.toFixed(2)}s (${this.stats.averageTimePerFile.toFixed(2)}s/file)`,
        );

        if (this.stats.errors.length > 0) {
            console.log('\n❌ Errors:');
            console.log('───────────────────────────');
            this.stats.errors.forEach(({ file, error }) => {
                console.log(`   ${path.basename(file)}: ${error}`);
            });
        }
    }
}
