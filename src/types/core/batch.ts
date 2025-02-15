import { ISubtitleOptions } from '../common/options';

/**
 * Options for batch processing of subtitles
 */
export interface IBatchOptions extends ISubtitleOptions {
    recursive: boolean;
    parallel: boolean;
    skipExisting: boolean;
    maxDepth?: number;
    includeDirectories?: string[];
    excludeDirectories?: string[];
    preserveStructure?: boolean;
}

/**
 * Statistics for batch processing operations
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
}
