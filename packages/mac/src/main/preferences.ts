import os from 'os';
import path from 'path';

import Store from 'electron-store';

import { ConfigManager } from '@subzilla/core';
import { IConfig, IStripOptions } from '@subzilla/types';

export interface IMacAppPreferences {
    // Application-specific preferences
    notifications: boolean;
    sounds: boolean;
    autoUpdate: boolean;
    startMinimized: boolean;
    showInDock: boolean;

    // Window preferences
    rememberWindowSize: boolean;
    lastWindowBounds?: {
        width: number;
        height: number;
        x?: number;
        y?: number;
    };
}

export class ConfigMapper {
    private store: Store<IConfig & { app: IMacAppPreferences }>;
    private rcConfig: IConfig | null = null;

    constructor() {
        console.log('⚙️ Initializing configuration store...');

        this.store = new Store({
            name: 'preferences',
            defaults: this.getDefaultConfig(),
            schema: {
                input: {
                    type: 'object',
                    properties: {
                        encoding: { type: 'string' },
                        format: { type: 'string' },
                    },
                },
                output: {
                    type: 'object',
                    properties: {
                        directory: { type: 'string' },
                        createBackup: { type: 'boolean' },
                        overwriteBackup: { type: 'boolean' },
                        format: { type: 'string' },
                        encoding: { type: 'string' },
                        bom: { type: 'boolean' },
                        lineEndings: { type: 'string' },
                        overwriteInput: { type: 'boolean' },
                        overwriteExisting: { type: 'boolean' },
                    },
                },
                strip: {
                    type: 'object',
                    properties: {
                        html: { type: 'boolean' },
                        colors: { type: 'boolean' },
                        styles: { type: 'boolean' },
                        urls: { type: 'boolean' },
                        timestamps: { type: 'boolean' },
                        numbers: { type: 'boolean' },
                        punctuation: { type: 'boolean' },
                        emojis: { type: 'boolean' },
                        brackets: { type: 'boolean' },
                        bidiControl: { type: 'boolean' },
                    },
                },
                batch: {
                    type: 'object',
                    properties: {
                        recursive: { type: 'boolean' },
                        parallel: { type: 'boolean' },
                        skipExisting: { type: 'boolean' },
                        maxDepth: { type: 'number' },
                        preserveStructure: { type: 'boolean' },
                        chunkSize: { type: 'number' },
                        retryCount: { type: 'number' },
                        retryDelay: { type: 'number' },
                        failFast: { type: 'boolean' },
                    },
                },
                app: {
                    type: 'object',
                    properties: {
                        notifications: { type: 'boolean' },
                        sounds: { type: 'boolean' },
                        autoUpdate: { type: 'boolean' },
                        startMinimized: { type: 'boolean' },
                        showInDock: { type: 'boolean' },
                        rememberWindowSize: { type: 'boolean' },
                    },
                },
            },
        });

        console.log('✅ Configuration store initialized');

        // Load RC config asynchronously (will be merged when getConfig() is called)
        // We don't await this to avoid blocking the constructor
        this.loadRcConfig().catch((err) => {
            console.warn('⚠️ Failed to load RC config:', err);
        });
    }

    /**
     * Load configuration from .subzillarc files (home directory and current working directory)
     * This follows the same precedence as the CLI: defaults < file config < env vars < app preferences
     */
    private async loadRcConfig(): Promise<void> {
        console.log('🔍 Loading RC configuration from root/home directory...');

        // Try to load from ConfigManager (which searches cwd and respects env vars)
        const coreConfig = await ConfigManager.loadConfig();

        // Also check home directory for global config
        const homeDir = os.homedir();
        const rcFiles = [
            '.subzillarc',
            '.subzilla.yml',
            '.subzilla.yaml',
            'subzilla.config.yml',
            'subzilla.config.yaml',
        ];

        let homeConfig: IConfig | null = null;

        for (const rcFile of rcFiles) {
            try {
                const homeRcPath = path.join(homeDir, rcFile);
                const fs = await import('fs/promises');

                await fs.access(homeRcPath);
                const yaml = await import('yaml');
                const content = await fs.readFile(homeRcPath, 'utf8');

                homeConfig = yaml.parse(content);
                console.log(`✅ Loaded RC config from ${homeRcPath}`);
                break;
            } catch {
                // Continue to next file
                continue;
            }
        }

        // Merge: coreConfig (from ConfigManager) is already merged with defaults and env vars
        // If we found a home config, it becomes our base RC config
        this.rcConfig = homeConfig || coreConfig;
        console.log('✅ RC configuration loaded successfully');
    }

    private getDefaultConfig(): IConfig & { app: IMacAppPreferences } {
        return {
            input: {
                encoding: 'auto',
                format: 'auto',
            },
            output: {
                encoding: 'utf8',
                createBackup: false,
                overwriteBackup: false,
                bom: true,
                lineEndings: 'auto',
                overwriteInput: false,
                overwriteExisting: true,
            },
            strip: {
                html: false,
                colors: false,
                styles: false,
                urls: false,
                timestamps: false,
                numbers: false,
                punctuation: false,
                emojis: false,
                brackets: false,
                bidiControl: true, // Default to true for better Arabic support
            },
            batch: {
                recursive: false,
                parallel: true,
                skipExisting: false,
                preserveStructure: false,
                chunkSize: 5,
                retryCount: 0,
                retryDelay: 1000,
                failFast: false,
            },
            app: {
                notifications: true,
                sounds: true,
                autoUpdate: true,
                startMinimized: false,
                showInDock: true,
                rememberWindowSize: true,
            },
        };
    }

    public getDefaultConfigData(): IConfig & { app: IMacAppPreferences } {
        return {
            input: {
                encoding: 'auto',
                format: 'auto',
            },
            output: {
                encoding: 'utf8',
                createBackup: false,
                overwriteBackup: false,
                bom: true,
                lineEndings: 'auto',
                overwriteInput: false,
                overwriteExisting: true,
            },
            strip: {
                html: false,
                colors: false,
                styles: false,
                urls: false,
                timestamps: false,
                numbers: false,
                punctuation: false,
                emojis: false,
                brackets: false,
                bidiControl: true,
            },
            batch: {
                recursive: false,
                parallel: true,
                skipExisting: false,
                preserveStructure: false,
                chunkSize: 5,
                retryCount: 0,
                retryDelay: 1000,
                failFast: false,
            },
            app: {
                notifications: true,
                sounds: true,
                autoUpdate: true,
                startMinimized: false,
                showInDock: true,
                rememberWindowSize: true,
            },
        };
    }

    public async getConfig(): Promise<IConfig> {
        const fullConfig = this.store.store;

        // Return only the IConfig part (without app preferences)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { app, ...storedConfig } = fullConfig;

        // Merge RC config (base) with stored preferences (override)
        // Precedence: defaults < RC file config < stored app preferences
        if (this.rcConfig) {
            return this.mergeConfigs(this.rcConfig, storedConfig);
        }

        return storedConfig;
    }

    /**
     * Deep merge two configuration objects (source overrides target)
     */
    private mergeConfigs(target: IConfig, source: Partial<IConfig>): IConfig {
        const result: IConfig = { ...target };

        if (source.input !== undefined) {
            result.input = { ...(target.input || {}), ...source.input };
        }

        if (source.output !== undefined) {
            result.output = { ...(target.output || {}), ...source.output };
        }

        if (source.strip !== undefined) {
            result.strip = { ...(target.strip || {}), ...source.strip };
        }

        if (source.batch !== undefined) {
            result.batch = { ...(target.batch || {}), ...source.batch };
        }

        return result;
    }

    public async getAppPreferences(): Promise<IMacAppPreferences> {
        return this.store.get('app', this.getDefaultConfig().app);
    }

    public async saveConfig(config: IConfig): Promise<void> {
        console.log('💾 Saving configuration...');

        // Preserve app preferences while updating core config
        const currentApp = await this.getAppPreferences();

        this.store.set({ ...config, app: currentApp });

        console.log('✅ Configuration saved');
    }

    public async saveAppPreferences(preferences: IMacAppPreferences): Promise<void> {
        console.log('💾 Saving app preferences...');
        this.store.set('app', preferences);
        console.log('✅ App preferences saved');
    }

    public async resetConfig(): Promise<void> {
        console.log('🔄 Resetting configuration to defaults...');
        this.store.clear();
        console.log('✅ Configuration reset');
    }

    public getConfigPath(): string {
        return this.store.path;
    }

    public getStore(): Store<IConfig & { app: IMacAppPreferences }> {
        return this.store;
    }

    // Preset management for quick formatting options
    public getFormattingPresets(): Record<string, IStripOptions> {
        return {
            None: {
                html: false,
                colors: false,
                styles: false,
                urls: false,
                timestamps: false,
                numbers: false,
                punctuation: false,
                emojis: false,
                brackets: false,
                bidiControl: false,
            },
            'Basic Clean': {
                html: true,
                colors: true,
                styles: true,
                urls: false,
                timestamps: false,
                numbers: false,
                punctuation: false,
                emojis: false,
                brackets: false,
                bidiControl: true,
            },
            'Deep Clean': {
                html: true,
                colors: true,
                styles: true,
                urls: true,
                timestamps: false,
                numbers: false,
                punctuation: true,
                emojis: false,
                brackets: true,
                bidiControl: true,
            },
            'Arabic Optimized': {
                html: true,
                colors: true,
                styles: true,
                urls: true,
                timestamps: false,
                numbers: false,
                punctuation: false,
                emojis: false,
                brackets: false,
                bidiControl: true,
            },
            'Maximum Clean': {
                html: true,
                colors: true,
                styles: true,
                urls: true,
                timestamps: false, // NEVER strip timestamps - corrupts SRT structure
                numbers: false, // NEVER strip numbers - corrupts SRT sequence numbers
                punctuation: true,
                emojis: true,
                brackets: true,
                bidiControl: true,
            },
        };
    }
}
