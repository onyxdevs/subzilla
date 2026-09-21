import os from 'os';
import path from 'path';

import Store from 'electron-store';

import { IConfig, IStripOptions, configSchema } from '@subzilla/types';

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

// userSavedConfig: set once the Preferences window has been saved. From then on
// Preferences is the only source of truth and .subzillarc files are ignored.
type TStoredConfig = IConfig & { app: IMacAppPreferences; userSavedConfig?: boolean };

export class ConfigMapper {
    private store: Store<TStoredConfig>;
    private rcConfig: IConfig | null = null;
    // getConfig() awaits this, so the first conversion after launch can never run
    // before the .subzillarc file has been read
    private rcLoaded: Promise<void>;

    constructor() {
        console.log('⚙️ Initializing configuration store...');

        this.store = new Store<TStoredConfig>({
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
                        markdown: { type: 'boolean' },
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
                userSavedConfig: { type: 'boolean' },
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

        // Load RC config asynchronously; a constructor cannot await, getConfig() does
        this.rcLoaded = this.loadRcConfig().catch((err) => {
            console.warn('⚠️ Failed to load RC config:', err);
        });
    }

    /**
     * Directories searched for RC files, in order of precedence (later overrides earlier)
     */
    protected async getRcSearchDirs(): Promise<string[]> {
        const fs = await import('fs/promises');
        const { app } = await import('electron');

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

        return searchDirs;
    }

    /**
     * Load configuration from .subzillarc files
     * Later search directories override earlier ones (see getRcSearchDirs).
     * How the result combines with stored Preferences is decided in getConfig().
     */
    private async loadRcConfig(): Promise<void> {
        console.log('🔍 Loading RC configuration...');

        const fs = await import('fs/promises');
        const yaml = await import('yaml');

        const rcFiles = [
            '.subzillarc',
            '.subzilla.yml',
            '.subzilla.yaml',
            'subzilla.config.yml',
            'subzilla.config.yaml',
        ];

        const searchDirs = await this.getRcSearchDirs();

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

                    // Validate, but keep the RAW object: the schema fills in its own
                    // defaults, which would override the app's defaults for keys the
                    // file never mentioned. A file that fails validation is ignored
                    // entirely rather than half-applied.
                    if (!config || typeof config !== 'object' || Array.isArray(config)) continue;

                    if (!configSchema.safeParse(config).success) {
                        console.warn(`⚠️ Ignoring invalid RC config: ${rcPath}`);

                        continue;
                    }

                    foundConfig = config;
                    foundPath = rcPath;
                    console.log(`✅ Loaded RC config from ${rcPath}`);
                } catch {
                    // Continue to next file
                    continue;
                }
            }
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
                markdown: false,
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
                markdown: false,
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

    /**
     * The effective conversion settings.
     *
     * Rule: once the Preferences window has been saved, Preferences is the only
     * source of truth. Until then, a .subzillarc file seeds the initial values over
     * the built-in defaults (and is what the Preferences window shows, so saving
     * locks those values in).
     *
     * "stored < RC" could never express this: electron-store materialises every
     * default into the store, so stored values always "won" - except for the few
     * keys without a default (output.directory, batch.maxDepth, ...), which leaked
     * through from the file even after the user had saved their preferences.
     */
    public async getConfig(): Promise<IConfig> {
        await this.rcLoaded;

        // Only the IConfig part: no app preferences, no bookkeeping
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { app, userSavedConfig, ...storedConfig } = this.store.store;

        if (this.hasUserSavedConfig() || !this.rcConfig) {
            return storedConfig;
        }

        return this.mergeConfigs(storedConfig, this.rcConfig);
    }

    /**
     * True once the user has saved Preferences. Installs that predate the marker
     * count as saved when their stored values differ from the defaults, so an
     * existing customised setup is never overridden by a .subzillarc file.
     */
    private hasUserSavedConfig(): boolean {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { app, userSavedConfig, ...storedConfig } = this.store.store;

        if (userSavedConfig === true) return true;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { app: defaultApp, ...defaultConfig } = this.getDefaultConfig();

        return !this.isSameConfig(storedConfig, defaultConfig);
    }

    private isSameConfig(a: unknown, b: unknown): boolean {
        const normalise = (value: unknown): unknown =>
            value && typeof value === 'object' && !Array.isArray(value)
                ? Object.fromEntries(
                      Object.entries(value as Record<string, unknown>)
                          .filter(([, entry]) => entry !== undefined)
                          .sort(([x], [y]) => x.localeCompare(y))
                          .map(([key, entry]) => [key, normalise(entry)]),
                  )
                : value;

        return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
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

        // From here on Preferences wins over any .subzillarc file (see getConfig)
        this.store.set({ ...config, app: currentApp, userSavedConfig: true });

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

    public getStore(): Store<TStoredConfig> {
        return this.store;
    }

    // Preset management for quick formatting options
    public getFormattingPresets(): Record<string, IStripOptions> {
        return {
            None: {
                html: false,
                markdown: false,
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
                markdown: true,
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
                markdown: true,
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
            'Maximum Clean': {
                html: true,
                markdown: true,
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
