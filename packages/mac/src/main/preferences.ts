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
     * Load configuration from .subzillarc files
     * Search order: cwd < app resources directory < home directory
     * This follows the same precedence as the CLI: defaults < file config < env vars < app preferences
     */
    private async loadRcConfig(): Promise<void> {
        console.log('🔍 Loading RC configuration...');

        const fs = await import('fs/promises');
        const yaml = await import('yaml');
        const { app } = await import('electron');

        const rcFiles = [
            '.subzillarc',
            '.subzilla.yml',
            '.subzilla.yaml',
            'subzilla.config.yml',
            'subzilla.config.yaml',
        ];

        // Directories to search for RC files (in order of precedence - later overrides earlier)
        const searchDirs = [
            os.homedir(), // Global user config
            app.isPackaged ? app.getPath('userData') : process.cwd(), // App data or dev cwd
        ];

        // In development mode, also check the project root (parent dirs)
        if (!app.isPackaged) {
            // Walk up from the current directory to find project root (where package.json is)
            let currentDir = process.cwd();

            for (let i = 0; i < 5; i++) {
                // Check up to 5 parent directories
                try {
                    await fs.access(path.join(currentDir, 'package.json'));
                    searchDirs.push(currentDir);
                    console.log(`📂 Found project root: ${currentDir}`);

                    break;
                } catch {
                    const parentDir = path.dirname(currentDir);

                    if (parentDir === currentDir) break; // Reached filesystem root

                    currentDir = parentDir;
                }
            }
        }

        let foundConfig: IConfig | null = null;
        let foundPath: string | null = null;

        // Search in all directories (later dirs override earlier)
        for (const dir of searchDirs) {
            for (const rcFile of rcFiles) {
                try {
                    const rcPath = path.join(dir, rcFile);

                    await fs.access(rcPath);

                    const content = await fs.readFile(rcPath, 'utf8');
                    const config = yaml.parse(content);

                    foundConfig = config;
                    foundPath = rcPath;
                    console.log(`✅ Loaded RC config from ${rcPath}`);
                } catch {
                    // Continue to next file
                    continue;
                }
            }
        }

        // Also try ConfigManager for env vars support
        try {
            const coreConfigResult = await ConfigManager.loadConfig();

            if (coreConfigResult.source === 'file' && coreConfigResult.filePath) {
                console.log(`✅ ConfigManager found config at: ${coreConfigResult.filePath}`);

                // If ConfigManager found a file we didn't find, use it
                if (!foundConfig) {
                    foundConfig = coreConfigResult.config;
                    foundPath = coreConfigResult.filePath;
                }
            }
        } catch {
            // Continue without ConfigManager config
        }

        if (foundConfig) {
            this.rcConfig = foundConfig;
            console.log(`✅ Using RC config from: ${foundPath}`);
        } else {
            console.log('ℹ️ No RC config file found, using defaults');
        }

        console.log('✅ RC configuration loading complete');
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
                timestamps: false, // NEVER strip - corrupts SRT structure
                numbers: false, // NEVER strip - corrupts SRT sequence numbers
                punctuation: false, // NEVER strip - removes : , --> from timestamps
                emojis: false,
                brackets: false, // NEVER strip - could affect subtitle structure
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
                timestamps: false, // NEVER strip - corrupts SRT structure
                numbers: false, // NEVER strip - corrupts SRT sequence numbers
                punctuation: false, // NEVER strip - removes : , --> from timestamps
                emojis: true,
                brackets: false, // NEVER strip - could affect subtitle structure
                bidiControl: true,
            },
        };
    }
}
