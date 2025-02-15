import { ISubtitleConfig } from '../core/config';

/**
 * Options for the strip command
 */
export interface IStripCommandOptions {
    stripHtml: boolean;
    stripColors: boolean;
    stripStyles: boolean;
    stripUrls: boolean;
    stripTimestamps: boolean;
    stripNumbers: boolean;
    stripPunctuation: boolean;
    stripEmojis: boolean;
    stripBrackets: boolean;
    stripAll: boolean;
}

/**
 * Base options for all commands
 */
export interface IBaseCommandOptions extends IStripCommandOptions {
    backup: boolean;
    loadedConfig?: ISubtitleConfig;
}

/**
 * Options for the convert command
 */
export interface IConvertCommandOptions extends IBaseCommandOptions {
    output?: string;
    bom?: boolean;
    lineEndings?: 'lf' | 'crlf' | 'auto';
    overwrite?: boolean;
    streaming?: boolean;
    bufferSize?: string;
    retryCount?: string;
    retryDelay?: string;
}

/**
 * Options for the batch command
 */
export interface IBatchCommandOptions extends IBaseCommandOptions {
    outputDir?: string;
    recursive: boolean;
    parallel: boolean;
    skipExisting: boolean;
    maxDepth?: string;
    includeDirs?: string[];
    excludeDirs?: string[];
    preserveStructure: boolean;
}
