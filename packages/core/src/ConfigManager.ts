import fs from 'fs/promises';
import path from 'path';

import yaml from 'yaml';
import { z } from 'zod';

import { IConfig, IConfigResult, TConfigSegment, configSchema } from '@subzilla/types';

/**
 * Manages configuration loading, validation, and saving
 * 🔧 Handles all configuration-related operations
 */
export default class ConfigManager {
    private static readonly CONFIG_FILE_NAMES = [
        '.subzillarc',
        '.subzilla.yml',
        '.subzilla.yaml',
        'subzilla.config.yml',
        'subzilla.config.yaml',
    ];

    private static readonly ENV_PREFIX = 'SUBZILLA_';

    // Map of known config property names for case-insensitive matching
    private static readonly KNOWN_PROPERTIES: Record<string, Record<string, string>> = {
        input: {
            encoding: 'encoding',
            format: 'format',
        },
        output: {
            directory: 'directory',
            createbackup: 'createBackup',
            overwritebackup: 'overwriteBackup',
            format: 'format',
            encoding: 'encoding',
            bom: 'bom',
            lineendings: 'lineEndings',
            overwriteinput: 'overwriteInput',
            overwriteexisting: 'overwriteExisting',
        },
        strip: {
            html: 'html',
            colors: 'colors',
            styles: 'styles',
            urls: 'urls',
            timestamps: 'timestamps',
            numbers: 'numbers',
            punctuation: 'punctuation',
            emojis: 'emojis',
            brackets: 'brackets',
            bidicontrol: 'bidiControl',
        },
        batch: {
            recursive: 'recursive',
            parallel: 'parallel',
            skipexisting: 'skipExisting',
            maxdepth: 'maxDepth',
            includedirectories: 'includeDirectories',
            excludedirectories: 'excludeDirectories',
            preservestructure: 'preserveStructure',
            chunksize: 'chunkSize',
            retrycount: 'retryCount',
            retrydelay: 'retryDelay',
            failfast: 'failFast',
        },
    };

    private static readonly DEFAULT_CONFIG: IConfig = {
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
        // error: {
        //     exitOnError: true,
        //     throwOnWarning: false,
        //     ignoreErrors: [],
        //     errorLogFile: 'error.log',
        // },
        // hooks: {
        //     beforeConversion: '',
        //     afterConversion: '',
        //     onError: '',
        //     onSuccess: '',
        // },
    };

    /**
     * 🔄 Load configuration from all sources and merge them
     */
    public static async loadConfig(configPath?: string): Promise<IConfigResult> {
        try {
            // Load config from different sources in order of precedence
            const envConfig = this.loadFromEnv();

            let fileConfig: IConfig | null = null;
            let resolvedFilePath: string | undefined;

            if (configPath) {
                fileConfig = await this.loadConfigFile(configPath);
                resolvedFilePath = configPath;
            } else {
                const found = await this.findAndLoadConfig();

                fileConfig = found?.config ?? null;
                resolvedFilePath = found?.filePath;
            }

            // Merge configs in order of precedence: defaults < file < env
            const mergedConfig = this.mergeConfigs(this.DEFAULT_CONFIG, fileConfig || {}, envConfig);

            // Validate the merged config
            const validatedConfig = await this.validateConfig(mergedConfig);

            return {
                config: validatedConfig,
                source: resolvedFilePath ? 'file' : 'default',
                filePath: resolvedFilePath,
            };
        } catch (error) {
            console.warn('⚠️ Failed to load config:', (error as Error).message);

            return {
                config: this.DEFAULT_CONFIG,
                source: 'default',
            };
        }
    }

    /**
     * 🌍 Load configuration from environment variables
     */
    private static loadFromEnv(): Partial<IConfig> {
        const config: TConfigSegment = {};

        for (const [key, value] of Object.entries(process.env)) {
            if (!key.startsWith(this.ENV_PREFIX)) continue;
            // Skip undefined or empty strings, but not whitespace-only strings
            if (value === undefined || value === '') continue;

            // Convert SUBZILLA_BATCH_CHUNK_SIZE to ['batch', 'chunkSize']
            const envKey = key.slice(this.ENV_PREFIX.length);
            const configPath = this.envKeyToConfigPath(envKey);

            this.setNestedValue(config, configPath, this.parseEnvValue(value));
        }

        return config as Partial<IConfig>;
    }

    /**
     * 🔍 Find and load the first available config file
     */
    private static async findAndLoadConfig(): Promise<{ config: IConfig; filePath: string } | null> {
        const cwd = process.cwd();

        for (const fileName of this.CONFIG_FILE_NAMES) {
            try {
                const filePath = path.join(cwd, fileName);

                await fs.access(filePath);

                const config = await this.loadConfigFile(filePath);

                return { config, filePath };
            } catch {
                continue;
            }
        }

        return null;
    }

    /**
     * 📄 Load configuration from a specific file
     */
    private static async loadConfigFile(filePath: string): Promise<IConfig> {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const config = yaml.parse(content);

            return config;
        } catch (error) {
            console.warn(`⚠️ Failed to load config file ${filePath}:`, (error as Error).message);
            throw error;
        }
    }

    /**
     * ✅ Validate configuration against schema
     */
    private static async validateConfig(config: IConfig): Promise<IConfig> {
        try {
            return configSchema.parse(config);
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.warn('⚠️ Config validation errors:');
                error.issues.forEach((err) => {
                    console.warn(`  - ${err.path.join('.')}: ${err.message}`);
                });
            }

            return this.DEFAULT_CONFIG;
        }
    }

    /**
     * 🔑 Convert environment variable key to config path
     * Example: BATCH_CHUNK_SIZE -> ['batch', 'chunkSize']
     * Example: INPUT_ENCODING -> ['input', 'encoding']
     * Example: STRIP -> ['strip']
     */
    private static envKeyToConfigPath(envKey: string): string[] {
        const parts = envKey.split('_');

        if (parts.length === 1) {
            // Single part like STRIP -> ['strip']
            return [parts[0].toLowerCase()];
        }

        // Multi-part: first part is section, rest form the property name
        const section = parts[0].toLowerCase();
        const propertyKey = parts.slice(1).join('').toLowerCase();

        // Look up the correct camelCase property name
        const correctPropertyName = this.KNOWN_PROPERTIES[section]?.[propertyKey] || propertyKey;

        return [section, correctPropertyName];
    }

    /**
     * 🔄 Parse environment variable value
     */
    private static parseEnvValue(value: string): unknown {
        // Try to parse as JSON first (handles arrays, objects, numbers, booleans, etc.)
        try {
            return JSON.parse(value);
        } catch {
            // Handle boolean strings
            if (value.toLowerCase() === 'true') return true;
            if (value.toLowerCase() === 'false') return false;

            // Try to parse as number
            const num = Number(value);

            if (!isNaN(num) && value.trim() !== '') {
                return num;
            }

            // Return as string if nothing else matches
            return value;
        }
    }

    /**
     * 🎯 Set nested value in configuration object
     */
    private static setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
        let current = obj;

        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];

            if (!(key in current)) {
                current[key] = {};
            }

            current = current[key] as Record<string, unknown>;
        }

        current[path[path.length - 1]] = value;
    }

    /**
     * 🔄 Deep merge configuration objects
     */
    private static mergeConfigs(...configs: Partial<IConfig>[]): IConfig {
        if (configs.length === 0) {
            return this.DEFAULT_CONFIG;
        }

        // Start with the first config and merge the rest
        const [first, ...rest] = configs;

        let result: IConfig = { ...first } as IConfig;

        for (const config of rest) {
            result = this.deepMergeConfig(result, config);
        }

        return result;
    }

    /**
     * 🔄 Deep merge two configuration objects
     */
    private static deepMergeConfig(target: IConfig, source: Partial<IConfig>): IConfig {
        if (!source) return target;

        const result: IConfig = { ...target };

        // Merge input
        if (source.input !== undefined) {
            result.input = { ...(target.input || {}), ...source.input };
        }

        // Merge output
        if (source.output !== undefined) {
            result.output = { ...(target.output || {}), ...source.output };
        }

        // Merge strip
        if (source.strip !== undefined) {
            result.strip = { ...(target.strip || {}), ...source.strip };
        }

        // Merge batch
        if (source.batch !== undefined) {
            result.batch = { ...(target.batch || {}), ...source.batch };
        }

        return result;
    }

    /**
     * 💾 Save configuration to file
     */
    public static async saveConfig(config: IConfig, filePath: string): Promise<void> {
        try {
            // Validate and throw on error (don't return defaults)
            const validatedConfig = configSchema.parse(config);
            const yamlContent = yaml.stringify(validatedConfig, { indent: 2 });

            await fs.writeFile(filePath, yamlContent, 'utf8');
            console.log(`✅ Configuration saved to ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to save config to ${filePath}:`, (error as Error).message);
            throw error;
        }
    }

    /**
     * 📝 Create default configuration file
     */
    public static async createDefaultConfig(filePath: string): Promise<void> {
        try {
            await this.saveConfig(this.DEFAULT_CONFIG, filePath);
            console.log(`✅ Default configuration created at ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to create default config:`, (error as Error).message);
            throw error;
        }
    }
}
