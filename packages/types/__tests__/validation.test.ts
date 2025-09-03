import { describe, it, expect } from '@jest/globals';

import { IConfig, IStripOptions } from '../src';
import { configSchema, stripOptionsSchema } from '../src/validation';

describe('Validation Schemas', () => {
    describe('stripOptionsSchema', () => {
        it('should validate valid strip options', () => {
            const validOptions: IStripOptions = {
                html: true,
                colors: false,
                styles: true,
                urls: false,
                timestamps: true,
                numbers: false,
                punctuation: true,
                emojis: false,
                brackets: true,
                bidiControl: false,
            };

            const result = stripOptionsSchema.safeParse(validOptions);

            expect(result.success).toBe(true);
        });

        it('should validate empty strip options', () => {
            const emptyOptions: IStripOptions = {};

            const result = stripOptionsSchema.safeParse(emptyOptions);

            expect(result.success).toBe(true);
        });

        it('should validate partial strip options', () => {
            const partialOptions: IStripOptions = {
                html: true,
                colors: true,
            };

            const result = stripOptionsSchema.safeParse(partialOptions);

            expect(result.success).toBe(true);
        });

        it('should reject invalid strip options', () => {
            const invalidOptions = {
                html: 'not-boolean',
                colors: 123,
            };

            const result = stripOptionsSchema.safeParse(invalidOptions);

            expect(result.success).toBe(false);
        });
    });

    describe('configSchema', () => {
        it('should validate complete valid config', () => {
            const validConfig: IConfig = {
                input: {
                    encoding: 'auto',
                    format: 'auto',
                },
                output: {
                    encoding: 'utf8',
                    createBackup: true,
                    bom: false,
                    lineEndings: 'lf',
                    overwriteInput: false,
                    overwriteExisting: true,
                },
                batch: {
                    recursive: true,
                    parallel: false,
                    skipExisting: true,
                    preserveStructure: false,
                    chunkSize: 10,
                    retryCount: 3,
                    retryDelay: 2000,
                    failFast: false,
                },
            };

            const result = configSchema.safeParse(validConfig);

            expect(result.success).toBe(true);
        });

        it('should validate minimal config', () => {
            const minimalConfig: IConfig = {
                input: {
                    encoding: 'auto',
                    format: 'auto',
                },
                output: {
                    encoding: 'utf8',
                    createBackup: false,
                    bom: true,
                    lineEndings: 'auto',
                    overwriteInput: false,
                    overwriteExisting: false,
                },
                batch: {
                    recursive: false,
                    parallel: false,
                    skipExisting: false,
                    preserveStructure: false,
                    chunkSize: 5,
                    retryCount: 0,
                    retryDelay: 1000,
                    failFast: false,
                },
            };

            const result = configSchema.safeParse(minimalConfig);

            expect(result.success).toBe(true);
        });

        it('should validate partial config', () => {
            const partialConfig = {
                input: {
                    encoding: 'utf8',
                },
                output: {
                    createBackup: true,
                },
            };

            const result = configSchema.safeParse(partialConfig);

            expect(result.success).toBe(true);
        });

        it('should reject invalid encoding values', () => {
            const invalidConfig = {
                input: {
                    encoding: 'invalid-encoding',
                },
            };

            const result = configSchema.safeParse(invalidConfig);

            expect(result.success).toBe(false);
        });

        it('should reject invalid line endings', () => {
            const invalidConfig = {
                output: {
                    lineEndings: 'invalid-line-ending',
                },
            };

            const result = configSchema.safeParse(invalidConfig);

            expect(result.success).toBe(false);
        });

        it('should reject negative chunk size', () => {
            const invalidConfig = {
                batch: {
                    chunkSize: -1,
                },
            };

            const result = configSchema.safeParse(invalidConfig);

            expect(result.success).toBe(false);
        });

        it('should reject negative retry count', () => {
            const invalidConfig = {
                batch: {
                    retryCount: -1,
                },
            };

            const result = configSchema.safeParse(invalidConfig);

            expect(result.success).toBe(false);
        });

        it('should reject negative retry delay', () => {
            const invalidConfig = {
                batch: {
                    retryDelay: -100,
                },
            };

            const result = configSchema.safeParse(invalidConfig);

            expect(result.success).toBe(false);
        });

        it('should handle boolean values correctly', () => {
            const configWithBooleans = {
                output: {
                    createBackup: true,
                    bom: false,
                    overwriteInput: true,
                    overwriteExisting: false,
                },
                batch: {
                    recursive: true,
                    parallel: false,
                    skipExisting: true,
                    preserveStructure: false,
                    failFast: true,
                },
            };

            const result = configSchema.safeParse(configWithBooleans);

            expect(result.success).toBe(true);
        });

        it('should handle string enum values correctly', () => {
            const configWithEnums = {
                input: {
                    encoding: 'utf8',
                    format: 'srt',
                },
                output: {
                    encoding: 'utf8',
                    lineEndings: 'crlf',
                },
            };

            const result = configSchema.safeParse(configWithEnums);

            expect(result.success).toBe(true);
        });
    });
});
