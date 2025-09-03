import { IConfig } from '../core/config';

/**
 * Options for the strip command
 */
export interface IStripCommandOptions {
    stripHtml?: boolean;
    stripColors?: boolean;
    stripStyles?: boolean;
    stripUrls?: boolean;
    stripTimestamps?: boolean;
    stripNumbers?: boolean;
    stripPunctuation?: boolean;
    stripEmojis?: boolean;
    stripBrackets?: boolean;
    stripBidiControl?: boolean;
    stripAll?: boolean;
}

/**
 * Base options for all commands
 */
interface IBaseCommandOptions extends IStripCommandOptions {
    backup?: boolean;
    overwriteBackup?: boolean;
    loadedConfig?: IConfig;
}

/**
 * Options for the convert command
 */
export interface IConvertCommandOptions extends IBaseCommandOptions {
    output?: string;
    bom?: boolean;
    lineEndings?: 'lf' | 'crlf' | 'auto';
    overwriteInput?: boolean;
    overwriteExisting?: boolean;
    retryCount?: string;
    retryDelay?: string;
}

/**
 * Options for the batch command
 */
export interface IBatchCommandOptions extends IConvertCommandOptions {
    outputDir?: string;
    recursive?: boolean;
    parallel?: boolean;
    skipExisting?: boolean;
    maxDepth?: string;
    includeDirs?: string[];
    excludeDirs?: string[];
    preserveStructure?: boolean;
    chunkSize?: number;
}

export interface IInfoCommandOptions {
    // Currently no special options needed, but we'll keep the interface for future extensibility
}
