import Store from 'electron-store';

import { IConfig, IStripOptions } from '@subzilla/types';

export class ConfigMapper {
    private store: Store<IConfig>;

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
            },
        });

        console.log('✅ Configuration store initialized');
    }

    private getDefaultConfig(): IConfig {
        return {
            input: {
                encoding: 'auto',
                format: 'auto',
            },
            output: {
                encoding: 'utf8',
                createBackup: false,
                overwriteBackup: true, // Match root .subzillarc
                bom: true,
                lineEndings: 'crlf', // Match root .subzillarc
                overwriteInput: true, // Match root .subzillarc
                overwriteExisting: true,
            },
            strip: {
                html: true, // Match root .subzillarc - enables HTML stripping by default
                colors: true, // Match root .subzillarc
                styles: true, // Match root .subzillarc
                urls: false,
                timestamps: false,
                numbers: false,
                punctuation: false,
                emojis: false,
                brackets: false,
                bidiControl: true, // Default to true for better Arabic support
            },
            batch: {
                recursive: true, // Match root .subzillarc
                parallel: true,
                skipExisting: true, // Match root .subzillarc
                preserveStructure: false,
                chunkSize: 5,
                retryCount: 3, // Match root .subzillarc
                retryDelay: 1000,
                failFast: false,
            },
        };
    }

    public getDefaultConfigData(): IConfig {
        return {
            input: {
                encoding: 'auto',
                format: 'auto',
            },
            output: {
                encoding: 'utf8',
                createBackup: false,
                overwriteBackup: true, // Match root .subzillarc
                bom: true,
                lineEndings: 'crlf', // Match root .subzillarc
                overwriteInput: true, // Match root .subzillarc
                overwriteExisting: true,
            },
            strip: {
                html: true, // Match root .subzillarc - enables HTML stripping by default
                colors: true, // Match root .subzillarc
                styles: true, // Match root .subzillarc
                urls: false,
                timestamps: false,
                numbers: false,
                punctuation: false,
                emojis: false,
                brackets: false,
                bidiControl: true,
            },
            batch: {
                recursive: true, // Match root .subzillarc
                parallel: true,
                skipExisting: true, // Match root .subzillarc
                preserveStructure: false,
                chunkSize: 5,
                retryCount: 3, // Match root .subzillarc
                retryDelay: 1000,
                failFast: false,
            },
        };
    }

    public async getConfig(): Promise<IConfig> {
        return this.store.store;
    }

    public async saveConfig(config: IConfig): Promise<void> {
        console.log('💾 Saving configuration...');
        this.store.set(config);
        console.log('✅ Configuration saved');
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
                timestamps: false, // Never strip - structural element
                numbers: false, // Never strip - structural element
                punctuation: true,
                emojis: true,
                brackets: true,
                bidiControl: true,
            },
        };
    }
}
