import { IStripOptions } from '../common/options';

/**
 * Main configuration interface for the application
 */
export interface ISubtitleConfig {
    input?: {
        encoding?: 'auto' | 'utf8' | 'utf16le' | 'utf16be' | 'ascii' | 'windows1256';
        format?: 'auto' | 'srt' | 'sub' | 'ass' | 'ssa' | 'txt';
        defaultLanguage?: string;
        detectBOM?: boolean;
        fallbackEncoding?: string;
    };
    output?: {
        directory?: string;
        preserveStructure?: boolean;
        createBackup?: boolean;
        format?: 'srt' | 'sub' | 'ass' | 'ssa' | 'txt';
        encoding?: 'utf8';
        bom?: boolean;
        lineEndings?: 'lf' | 'crlf' | 'auto';
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
        chunkSize?: number;
        retryCount?: number;
        retryDelay?: number;
        failFast?: boolean;
    };
    performance?: {
        maxConcurrency?: number;
        bufferSize?: number;
        useStreaming?: boolean;
        memoryLimit?: number;
        timeout?: number;
    };
    logging?: {
        level?: 'error' | 'warn' | 'info' | 'debug';
        file?: string;
        format?: 'text' | 'json';
        colors?: boolean;
        timestamp?: boolean;
        maxFiles?: number;
        maxSize?: number;
    };
    error?: {
        exitOnError?: boolean;
        throwOnWarning?: boolean;
        ignoreErrors?: string[];
        errorLogFile?: string;
    };
    hooks?: {
        beforeConversion?: string;
        afterConversion?: string;
        onError?: string;
        onSuccess?: string;
    };
}

/**
 * Type for recursive record structures in config
 */
export type TRecursiveRecord<T> = {
    [key: string]: T | TRecursiveRecord<T>;
};

/**
 * Type for config segments
 */
export type TConfigSegment = TRecursiveRecord<string | number | boolean>;
