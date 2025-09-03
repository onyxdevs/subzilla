const Store = require('electron-store');
import { IConfig, IStripOptions } from '@subzilla/types';

export interface MacAppPreferences {
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
    private store: Store<IConfig & { app: MacAppPreferences }>;

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
                        format: { type: 'string' }
                    }
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
                        overwriteExisting: { type: 'boolean' }
                    }
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
                        bidiControl: { type: 'boolean' }
                    }
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
                        failFast: { type: 'boolean' }
                    }
                },
                app: {
                    type: 'object',
                    properties: {
                        notifications: { type: 'boolean' },
                        sounds: { type: 'boolean' },
                        autoUpdate: { type: 'boolean' },
                        startMinimized: { type: 'boolean' },
                        showInDock: { type: 'boolean' },
                        rememberWindowSize: { type: 'boolean' }
                    }
                }
            }
        });

        console.log('✅ Configuration store initialized');
    }

    private getDefaultConfig(): IConfig & { app: MacAppPreferences } {
        return {
            input: {
                encoding: 'auto',
                format: 'auto'
            },
            output: {
                encoding: 'utf8',
                createBackup: false,
                overwriteBackup: false,
                bom: true,
                lineEndings: 'auto',
                overwriteInput: false,
                overwriteExisting: false
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
                bidiControl: true // Default to true for better Arabic support
            },
            batch: {
                recursive: false,
                parallel: true,
                skipExisting: false,
                preserveStructure: false,
                chunkSize: 5,
                retryCount: 0,
                retryDelay: 1000,
                failFast: false
            },
            app: {
                notifications: true,
                sounds: true,
                autoUpdate: true,
                startMinimized: false,
                showInDock: true,
                rememberWindowSize: true
            }
        };
    }

    public getDefaultConfigData(): IConfig & { app: MacAppPreferences } {
        return {
            input: {
                encoding: 'auto',
                format: 'auto'
            },
            output: {
                encoding: 'utf8',
                createBackup: false,
                overwriteBackup: false,
                bom: true,
                lineEndings: 'auto',
                overwriteInput: false,
                overwriteExisting: false
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
                bidiControl: true
            },
            batch: {
                recursive: false,
                parallel: true,
                skipExisting: false,
                preserveStructure: false,
                chunkSize: 5,
                retryCount: 0,
                retryDelay: 1000,
                failFast: false
            },
            app: {
                notifications: true,
                sounds: true,
                autoUpdate: true,
                startMinimized: false,
                showInDock: true,
                rememberWindowSize: true
            }
        };
    }

    public async getConfig(): Promise<IConfig> {
        const fullConfig = this.store.store;
        
        // Return only the IConfig part (without app preferences)
        const { app, ...config } = fullConfig;
        return config;
    }

    public async getAppPreferences(): Promise<MacAppPreferences> {
        return this.store.get('app', this.getDefaultConfig().app);
    }

    public async saveConfig(config: IConfig): Promise<void> {
        console.log('💾 Saving configuration...');
        
        // Preserve app preferences while updating core config
        const currentApp = await this.getAppPreferences();
        this.store.set({ ...config, app: currentApp });
        
        console.log('✅ Configuration saved');
    }

    public async saveAppPreferences(preferences: MacAppPreferences): Promise<void> {
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

    public getStore(): any {
        return this.store;
    }

    // Preset management for quick formatting options
    public getFormattingPresets(): Record<string, IStripOptions> {
        return {
            'None': {
                html: false,
                colors: false,
                styles: false,
                urls: false,
                timestamps: false,
                numbers: false,
                punctuation: false,
                emojis: false,
                brackets: false,
                bidiControl: false
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
                bidiControl: true
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
                bidiControl: true
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
                bidiControl: true
            },
            'Maximum Clean': {
                html: true,
                colors: true,
                styles: true,
                urls: true,
                timestamps: true,
                numbers: true,
                punctuation: true,
                emojis: true,
                brackets: true,
                bidiControl: true
            }
        };
    }
}