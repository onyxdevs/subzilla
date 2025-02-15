import { z } from 'zod';

export const stripOptionsSchema = z.object({
    html: z.boolean().default(false),
    colors: z.boolean().default(false),
    styles: z.boolean().default(false),
    urls: z.boolean().default(false),
    timestamps: z.boolean().optional(),
    numbers: z.boolean().optional(),
    punctuation: z.boolean().optional(),
    emojis: z.boolean().optional(),
    brackets: z.boolean().optional(),
});

export const configSchema = z.object({
    input: z
        .object({
            encoding: z
                .enum(['auto', 'utf8', 'utf16le', 'utf16be', 'ascii', 'windows1256'])
                .default('auto'),
            format: z.enum(['auto', 'srt', 'sub', 'ass', 'ssa', 'txt']).default('auto'),
            defaultLanguage: z.string().min(2).max(5).default('en'),
            detectBOM: z.boolean().default(true),
            fallbackEncoding: z.string().optional(),
        })
        .optional(),

    output: z
        .object({
            directory: z.string().optional(),
            preserveStructure: z.boolean().default(false),
            createBackup: z.boolean().default(false),
            format: z.enum(['srt', 'sub', 'ass', 'ssa', 'txt']).optional(),
            encoding: z.literal('utf8').default('utf8'),
            bom: z.boolean().default(false),
            lineEndings: z.enum(['lf', 'crlf', 'auto']).default('auto'),
            overwriteExisting: z.boolean().default(false),
        })
        .optional(),

    strip: stripOptionsSchema.optional(),

    batch: z
        .object({
            recursive: z.boolean().default(false),
            parallel: z.boolean().default(false),
            skipExisting: z.boolean().default(false),
            maxDepth: z.number().int().min(1).optional(),
            includeDirectories: z.array(z.string()).optional(),
            excludeDirectories: z.array(z.string()).optional(),
            chunkSize: z.number().int().min(1).max(100).default(5),
            retryCount: z.number().int().min(0).max(5).default(0),
            retryDelay: z.number().int().min(100).max(5000).default(1000),
            failFast: z.boolean().default(false),
        })
        .optional(),

    performance: z
        .object({
            maxConcurrency: z.number().int().min(1).max(10).default(3),
            bufferSize: z
                .number()
                .int()
                .min(1024)
                .max(1024 * 1024)
                .default(8192),
            useStreaming: z.boolean().default(false),
            memoryLimit: z.number().int().min(64).max(1024).optional(),
            timeout: z.number().int().min(1000).max(300000).optional(),
        })
        .optional(),

    logging: z
        .object({
            level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
            file: z.string().optional(),
            format: z.enum(['text', 'json']).default('text'),
            colors: z.boolean().default(true),
            timestamp: z.boolean().default(true),
            maxFiles: z.number().int().min(1).max(10).optional(),
            maxSize: z
                .number()
                .int()
                .min(1024 * 1024)
                .max(1024 * 1024 * 100)
                .optional(),
        })
        .optional(),

    error: z
        .object({
            exitOnError: z.boolean().default(true),
            throwOnWarning: z.boolean().default(false),
            ignoreErrors: z.array(z.string()).optional(),
            errorLogFile: z.string().optional(),
        })
        .optional(),

    hooks: z
        .object({
            beforeConversion: z.string().optional(),
            afterConversion: z.string().optional(),
            onError: z.string().optional(),
            onSuccess: z.string().optional(),
        })
        .optional(),
});

export type TConfigSchema = z.infer<typeof configSchema>;
