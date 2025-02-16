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
export interface IProcessingOptions {
    strip?: IStripOptions;
    outputDir?: string;
    preserveTimestamps?: boolean;
    backupOriginal?: boolean;
    bom?: boolean;
    lineEndings?: 'lf' | 'crlf' | 'auto';
    overwriteExisting?: boolean;
    retryCount?: number;
    retryDelay?: number;
    failFast?: boolean;
}
