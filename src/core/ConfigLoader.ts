import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { ISubtitleConfig } from '../types/core/config';
import { configSchema } from '../types/validation';

type TRecursiveRecord<T> = {
    [key: string]: T | TRecursiveRecord<T>;
};

type TConfigSegment = TRecursiveRecord<string | number | boolean>;

export class ConfigLoader {
    private static readonly CONFIG_FILE_NAMES = [
        '.subzillarc',
        '.subzilla.yml',
        '.subzilla.yaml',
        'subzilla.config.yml',
        'subzilla.config.yaml',
    ];

    private static readonly ENV_PREFIX = 'SUBZILLA_';

    private static readonly DEFAULT_CONFIG: ISubtitleConfig = {
        input: {
            encoding: 'auto',
            format: 'auto',
            defaultLanguage: 'en',
            detectBOM: true,
        },
        output: {
            encoding: 'utf8',
            preserveStructure: false,
            createBackup: false,
            bom: false,
            lineEndings: 'auto',
            overwriteExisting: false,
        },
        batch: {
            recursive: false,
            parallel: false,
            skipExisting: false,
            chunkSize: 5,
            retryCount: 0,
            retryDelay: 1000,
            failFast: false,
        },
        performance: {
            maxConcurrency: 3,
            bufferSize: 8192,
            useStreaming: false,
        },
        logging: {
            level: 'info',
            format: 'text',
            colors: true,
            timestamp: true,
        },
        error: {
            exitOnError: true,
            throwOnWarning: false,
        },
    };

    public static async loadConfig(configPath?: string): Promise<ISubtitleConfig> {
        try {
            // Load config from different sources in order of precedence
            const envConfig = this.loadFromEnv();
            const fileConfig = configPath
                ? await this.loadConfigFile(configPath)
                : await this.findAndLoadConfig();

            // Merge configs in order of precedence: defaults < file < env
            const mergedConfig = this.mergeConfigs(
                this.DEFAULT_CONFIG,
                fileConfig || {},
                envConfig
            );

            // Validate the merged config
            const validatedConfig = await this.validateConfig(mergedConfig);

            return validatedConfig;
        } catch (error) {
            console.warn('Failed to load config:', (error as Error).message);

            return this.DEFAULT_CONFIG;
        }
    }

    private static loadFromEnv(): Partial<ISubtitleConfig> {
        const config: TConfigSegment = {};

        for (const [key, value] of Object.entries(process.env)) {
            if (!key.startsWith(this.ENV_PREFIX) || !value) continue;

            const configPath = key.slice(this.ENV_PREFIX.length).toLowerCase().split('_');
            let current = config;

            for (let i = 0; i < configPath.length - 1; i++) {
                const segment = configPath[i];

                if (!(current[segment] instanceof Object)) {
                    current[segment] = {};
                }
                current = current[segment] as TConfigSegment;
            }

            const lastSegment = configPath[configPath.length - 1];

            current[lastSegment] = this.parseEnvValue(value);
        }

        return config as Partial<ISubtitleConfig>;
    }

    private static parseEnvValue(
        value: string
    ): string | number | boolean | TRecursiveRecord<string | number | boolean> {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    private static async validateConfig(config: ISubtitleConfig): Promise<ISubtitleConfig> {
        try {
            return configSchema.parse(config);
        } catch (error) {
            console.warn('Config validation failed:', error);

            return this.DEFAULT_CONFIG;
        }
    }

    private static async findAndLoadConfig(): Promise<ISubtitleConfig | null> {
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

    private static async loadConfigFile(filePath: string): Promise<ISubtitleConfig> {
        const content = await fs.readFile(filePath, 'utf8');
        const config = yaml.parse(content) as ISubtitleConfig;

        return config;
    }

    private static mergeConfigs(...configs: Partial<ISubtitleConfig>[]): ISubtitleConfig {
        return configs.reduce((acc, config) => {
            return this.deepMerge(acc, config);
        }, {} as ISubtitleConfig);
    }

    private static deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
        if (!source) return target;

        const result = { ...target };

        for (const key in source) {
            const sourceValue = source[key];

            if (sourceValue instanceof Object && !Array.isArray(sourceValue)) {
                const targetValue = result[key] as Record<string, unknown>;

                result[key] = this.deepMerge(
                    (targetValue || {}) as Record<string, unknown>,
                    sourceValue as Record<string, unknown>
                ) as T[Extract<keyof T, string>];
            } else {
                result[key] = sourceValue as T[Extract<keyof T, string>];
            }
        }

        return result;
    }

    public static async saveConfig(config: ISubtitleConfig, filePath: string): Promise<void> {
        const validatedConfig = await this.validateConfig(config);
        const yamlContent = yaml.stringify(validatedConfig, { indent: 2 });

        await fs.writeFile(filePath, yamlContent, 'utf8');
    }

    public static async createDefaultConfig(filePath: string): Promise<void> {
        await this.saveConfig(this.DEFAULT_CONFIG, filePath);
    }
}
