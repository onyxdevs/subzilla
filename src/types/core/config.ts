import { IStripOptions } from './options';

/**
 * Main configuration interface for the application
 */
export interface IConfig {
    input?: {
        encoding?: 'auto' | 'utf8' | 'utf16le' | 'utf16be' | 'ascii' | 'windows1256';
        format?: 'auto' | 'srt' | 'sub' | 'ass' | 'ssa' | 'txt';
    };
    output?: {
        directory?: string;
        createBackup?: boolean;
        overwriteBackup?: boolean;
        format?: 'srt' | 'sub' | 'ass' | 'ssa' | 'txt';
        encoding?: 'utf8';
        bom?: boolean;
        lineEndings?: 'lf' | 'crlf' | 'auto';
        overwriteInput?: boolean;
        overwriteExisting?: boolean;
    };
    strip?: IStripOptions;
    batch?: {
        recursive?: boolean;
        parallel?: boolean;
        skipExisting?: boolean;
        maxDepth?: number;
        includeDirectories?: string[];
        excludeDirectories?: string[];
        preserveStructure?: boolean;
        chunkSize?: number;
        retryCount?: number;
        retryDelay?: number;
        failFast?: boolean;
    };
    // error?: {
    //     exitOnError?: boolean;
    //     throwOnWarning?: boolean;
    //     ignoreErrors?: string[];
    //     errorLogFile?: string;
    // };
    // hooks?: {
    //     beforeConversion?: string;
    //     afterConversion?: string;
    //     onError?: string;
    //     onSuccess?: string;
    // };
}

/**
 * Type for recursive record structures in config
 */
type TRecursiveRecord<T> = {
    [key: string]: T | TRecursiveRecord<T>;
};

/**
 * Type for config segments
 */
export type TConfigSegment = TRecursiveRecord<string | number | boolean>;
