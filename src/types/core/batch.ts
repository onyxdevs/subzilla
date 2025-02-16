import { IProcessingOptions } from '../options';

/**
 * Options for batch processing of subtitles
 */
export interface IBatchOptions extends IProcessingOptions {
    recursive: boolean;
    parallel: boolean;
    skipExisting: boolean;
    maxDepth?: number;
    includeDirectories?: string[];
    excludeDirectories?: string[];
    preserveStructure?: boolean;
    chunkSize?: number;
    retryCount?: number;
    retryDelay?: number;
    failFast?: boolean;
}

/**
 * Statistics for batch processing
 */
export interface IBatchStats {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: Array<{ file: string; error: string }>;
    timeTaken: number;
    averageTimePerFile: number;
    directoriesProcessed: number;
    filesByDirectory: Record<
        string,
        {
            total: number;
            successful: number;
            failed: number;
            skipped: number;
        }
    >;
    startTime: number;
    endTime: number;
}
