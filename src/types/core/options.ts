/**
 * Base options for stripping content from subtitles
 */
export interface IStripOptions {
    html: boolean;
    colors: boolean;
    styles: boolean;
    urls: boolean;
    timestamps?: boolean;
    numbers?: boolean;
    punctuation?: boolean;
    emojis?: boolean;
    brackets?: boolean;
}

/**
 * Base options for subtitle processing
 */
export interface IConvertOptions {
    strip?: IStripOptions;
    outputDir?: string;
    preserveTimestamps?: boolean;
    backupOriginal?: boolean;
    bom?: boolean;
    lineEndings?: 'lf' | 'crlf' | 'auto';
    overwriteInput?: boolean;
    overwriteExisting?: boolean;
    retryCount?: number;
    retryDelay?: number;
    failFast?: boolean;
}

/**
 * Options for batch processing of subtitles
 */
export interface IBatchOptions {
    common: IConvertOptions;
    batch: {
        recursive: boolean;
        parallel: boolean;
        skipExisting: boolean;
        maxDepth?: number;
        includeDirectories?: string[];
        excludeDirectories?: string[];
        preserveStructure?: boolean;
        chunkSize?: number;
    };
}
