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
