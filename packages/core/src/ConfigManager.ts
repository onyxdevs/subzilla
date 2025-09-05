import fs from 'fs/promises';
import path from 'path';

import yaml from 'yaml';
import { z } from 'zod';

import { IConfig, TConfigSegment, configSchema } from '@subzilla/types';

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
    public static async loadConfig(configPath?: string): Promise<IConfig> {
        try {
            // Load config from different sources in order of precedence
            const envConfig = this.loadFromEnv();
            const fileConfig = configPath ? await this.loadConfigFile(configPath) : await this.findAndLoadConfig();

            // Merge configs in order of precedence: defaults < file < env
            const mergedConfig = this.mergeConfigs(this.DEFAULT_CONFIG, fileConfig || {}, envConfig);

            // Validate the merged config
            const validatedConfig = await this.validateConfig(mergedConfig);

            return validatedConfig;
        } catch (error) {
            console.warn('⚠️ Failed to load config:', (error as Error).message);

            return this.DEFAULT_CONFIG;
        }
    }

    /**
     * 🌍 Load configuration from environment variables
     */
    private static loadFromEnv(): Partial<IConfig> {
        const config: TConfigSegment = {};

        for (const [key, value] of Object.entries(process.env)) {
            if (!key.startsWith(this.ENV_PREFIX) || !value) continue;

            const configPath = key.slice(this.ENV_PREFIX.length).toLowerCase().split('_');

            this.setNestedValue(config, configPath, this.parseEnvValue(value));
        }

        return config as Partial<IConfig>;
    }

    /**
     * 🔍 Find and load the first available config file
     */
    private static async findAndLoadConfig(): Promise<IConfig | null> {
        const cwd = process.cwd();

        for (const fileName of this.CONFIG_FILE_NAMES) {
            try {
                const filePath = path.join(cwd, fileName);

                await fs.access(filePath);

                return await this.loadConfigFile(filePath);
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
     * 🔄 Parse environment variable value
     */
    private static parseEnvValue(value: string): unknown {
        try {
            return JSON.parse(value);
        } catch {
            // If it's not valid JSON, return as is
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
        return configs.reduce((acc, config) => {
            return this.deepMerge(acc, config);
        }, {} as IConfig);
    }

    /**
     * 🔄 Deep merge two objects
     */
    private static deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
        if (!source) return target;

        const result = { ...target };

        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const sourceValue = source[key];

                if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
                    const targetValue = result[key] as Record<string, unknown>;

                    result[key] = this.deepMerge(
                        (targetValue || {}) as Record<string, unknown>,
                        sourceValue as Record<string, unknown>,
                    ) as T[Extract<keyof T, string>];
                } else {
                    result[key] = sourceValue as T[Extract<keyof T, string>];
                }
            }
        }

        return result;
    }

    /**
     * 💾 Save configuration to file
     */
    public static async saveConfig(config: IConfig, filePath: string): Promise<void> {
        try {
            const validatedConfig = await this.validateConfig(config);
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
