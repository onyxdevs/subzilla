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
export interface ISubtitleOptions {
    strip?: IStripOptions;
    outputDir?: string;
    preserveTimestamps?: boolean;
    backupOriginal?: boolean;
}
