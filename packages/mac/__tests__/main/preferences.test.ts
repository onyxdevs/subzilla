import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { IConfig, IStripOptions } from '@subzilla/types';

// Mock electron-store
const mockStoreInstance = {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
    store: {},
    path: '/mock/path/to/preferences.json',
};

jest.mock('electron-store', () => {
    return jest.fn().mockImplementation(() => mockStoreInstance);
});

interface IMacAppPreferences {
    notifications: boolean;
    sounds: boolean;
    autoUpdate: boolean;
    startMinimized: boolean;
    showInDock: boolean;
    rememberWindowSize: boolean;
    lastWindowBounds?: {
        width: number;
        height: number;
        x?: number;
        y?: number;
    };
}

interface IConfigMapper {
    getConfig: () => Promise<IConfig>;
    getAppPreferences: () => Promise<IMacAppPreferences>;
    saveConfig: (config: IConfig) => Promise<void>;
    saveAppPreferences: (preferences: IMacAppPreferences) => Promise<void>;
    resetConfig: () => Promise<void>;
    getConfigPath: () => string;
    getStore: () => unknown;
    getDefaultConfigData: () => IConfig & { app: IMacAppPreferences };
    getFormattingPresets: () => Record<string, IStripOptions>;
}

describe('ConfigMapper - Preferences Management', () => {
    let ConfigMapper: new () => IConfigMapper;
    let configMapper: IConfigMapper;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Reset mock store
        mockStoreInstance.store = {
            input: { encoding: 'auto', format: 'auto' },
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

        // Import ConfigMapper
        const preferencesModule = await import('../../src/main/preferences');

        ConfigMapper = preferencesModule.ConfigMapper;
        configMapper = new ConfigMapper();
    });

    describe('Initialization', () => {
        it('should create a new ConfigMapper instance', () => {
            expect(configMapper).toBeDefined();
        });

        it('should initialize electron-store with defaults', () => {
            const Store = require('electron-store');

            expect(Store).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'preferences',
                    defaults: expect.any(Object),
                    schema: expect.any(Object),
                }),
            );
        });

        it('should have correct default configuration', () => {
            const defaults = configMapper.getDefaultConfigData();

            expect(defaults.input!.encoding).toBe('auto');
            expect(defaults.output!.encoding).toBe('utf8');
            expect(defaults.output!.bom).toBe(true);
            expect(defaults.strip?.bidiControl).toBe(true);
            expect(defaults.batch?.parallel).toBe(true);
            expect(defaults.app.notifications).toBe(true);
        });
    });

    describe('Configuration Management', () => {
        it('should get configuration without app preferences', async () => {
            const config = await configMapper.getConfig();

            expect(config).toHaveProperty('input');
            expect(config).toHaveProperty('output');
            expect(config).toHaveProperty('strip');
            expect(config).toHaveProperty('batch');
            expect(config).not.toHaveProperty('app');
        });

        it('should get app preferences separately', async () => {
            mockStoreInstance.get.mockReturnValue({
                notifications: true,
                sounds: false,
                autoUpdate: true,
                startMinimized: false,
                showInDock: true,
                rememberWindowSize: true,
            });

            const appPrefs = await configMapper.getAppPreferences();

            expect(appPrefs).toHaveProperty('notifications');
            expect(appPrefs).toHaveProperty('sounds');
            expect(appPrefs).toHaveProperty('autoUpdate');
            expect(appPrefs.sounds).toBe(false);
        });

        it('should save configuration while preserving app preferences', async () => {
            const newConfig: IConfig = {
                input: { encoding: 'auto', format: 'auto' },
                output: {
                    encoding: 'utf8',
                    createBackup: true,
                    overwriteBackup: true,
                },
                strip: {
                    html: true,
                    colors: true,
                },
                batch: {
                    parallel: false,
                    chunkSize: 10,
                },
            };

            await configMapper.saveConfig(newConfig);

            expect(mockStoreInstance.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: newConfig.input,
                    output: expect.objectContaining({
                        encoding: 'utf8',
                        createBackup: true,
                    }),
                    app: expect.any(Object), // App prefs should be preserved
                }),
            );
        });

        it('should save app preferences', async () => {
            const newAppPrefs = {
                notifications: false,
                sounds: false,
                autoUpdate: false,
                startMinimized: true,
                showInDock: false,
                rememberWindowSize: false,
            };

            await configMapper.saveAppPreferences(newAppPrefs);

            expect(mockStoreInstance.set).toHaveBeenCalledWith('app', newAppPrefs);
        });

        it('should reset configuration to defaults', async () => {
            await configMapper.resetConfig();

            expect(mockStoreInstance.clear).toHaveBeenCalled();
        });

        it('should get config path', () => {
            const path = configMapper.getConfigPath();

            expect(path).toBe('/mock/path/to/preferences.json');
        });

        it('should get store instance', () => {
            const store = configMapper.getStore();

            expect(store).toBeDefined();
        });
    });

    describe('Formatting Presets', () => {
        it('should provide formatting presets', () => {
            const presets = configMapper.getFormattingPresets();

            expect(presets).toHaveProperty('None');
            expect(presets).toHaveProperty('Basic Clean');
            expect(presets).toHaveProperty('Deep Clean');
            expect(presets).toHaveProperty('Arabic Optimized');
            expect(presets).toHaveProperty('Maximum Clean');
        });

        it('should have None preset with all options disabled', () => {
            const presets = configMapper.getFormattingPresets();
            const nonePreset = presets['None'];

            expect(nonePreset.html).toBe(false);
            expect(nonePreset.colors).toBe(false);
            expect(nonePreset.styles).toBe(false);
            expect(nonePreset.urls).toBe(false);
            expect(nonePreset.bidiControl).toBe(false);
        });

        it('should have Basic Clean preset with essential formatting options', () => {
            const presets = configMapper.getFormattingPresets();
            const basicClean = presets['Basic Clean'];

            expect(basicClean.html).toBe(true);
            expect(basicClean.colors).toBe(true);
            expect(basicClean.styles).toBe(true);
            expect(basicClean.urls).toBe(false);
            expect(basicClean.bidiControl).toBe(true);
        });

        it('should have Deep Clean preset with safe stripping options (no punctuation/brackets to prevent file corruption)', () => {
            const presets = configMapper.getFormattingPresets();
            const deepClean = presets['Deep Clean'];

            expect(deepClean.html).toBe(true);
            expect(deepClean.colors).toBe(true);
            expect(deepClean.styles).toBe(true);
            expect(deepClean.urls).toBe(true);
            // These must be false to prevent SRT file corruption
            expect(deepClean.timestamps).toBe(false);
            expect(deepClean.numbers).toBe(false);
            expect(deepClean.punctuation).toBe(false);
            expect(deepClean.brackets).toBe(false);
            expect(deepClean.bidiControl).toBe(true);
        });

        it('should have Arabic Optimized preset with RTL support', () => {
            const presets = configMapper.getFormattingPresets();
            const arabicOptimized = presets['Arabic Optimized'];

            expect(arabicOptimized.html).toBe(true);
            expect(arabicOptimized.bidiControl).toBe(true);
            expect(arabicOptimized.punctuation).toBe(false);
        });

        it('should have Maximum Clean preset with safe options enabled (no timestamps/numbers/punctuation/brackets to prevent file corruption)', () => {
            const presets = configMapper.getFormattingPresets();
            const maxClean = presets['Maximum Clean'];

            expect(maxClean.html).toBe(true);
            expect(maxClean.colors).toBe(true);
            expect(maxClean.styles).toBe(true);
            expect(maxClean.urls).toBe(true);
            // These must be false to prevent SRT file corruption
            expect(maxClean.timestamps).toBe(false);
            expect(maxClean.numbers).toBe(false);
            expect(maxClean.punctuation).toBe(false);
            expect(maxClean.emojis).toBe(true);
            expect(maxClean.brackets).toBe(false);
            expect(maxClean.bidiControl).toBe(true);
        });
    });

    describe('Default Configuration Values', () => {
        it('should have correct input defaults', () => {
            const defaults = configMapper.getDefaultConfigData();

            expect(defaults.input!.encoding).toBe('auto');
            expect(defaults.input!.format).toBe('auto');
        });

        it('should have correct output defaults', () => {
            const defaults = configMapper.getDefaultConfigData();

            expect(defaults.output!.encoding).toBe('utf8');
            expect(defaults.output!.createBackup).toBe(false);
            expect(defaults.output!.overwriteBackup).toBe(false);
            expect(defaults.output!.bom).toBe(true);
            expect(defaults.output!.lineEndings).toBe('auto');
            expect(defaults.output!.overwriteInput).toBe(false);
            expect(defaults.output!.overwriteExisting).toBe(true);
        });

        it('should have correct strip defaults', () => {
            const defaults = configMapper.getDefaultConfigData();

            expect(defaults.strip?.html).toBe(false);
            expect(defaults.strip?.colors).toBe(false);
            expect(defaults.strip?.styles).toBe(false);
            expect(defaults.strip?.urls).toBe(false);
            expect(defaults.strip?.timestamps).toBe(false);
            expect(defaults.strip?.numbers).toBe(false);
            expect(defaults.strip?.punctuation).toBe(false);
            expect(defaults.strip?.emojis).toBe(false);
            expect(defaults.strip?.brackets).toBe(false);
            expect(defaults.strip?.bidiControl).toBe(true); // Default to true for Arabic support
        });

        it('should have correct batch defaults', () => {
            const defaults = configMapper.getDefaultConfigData();

            expect(defaults.batch!.recursive).toBe(false);
            expect(defaults.batch!.parallel).toBe(true);
            expect(defaults.batch!.skipExisting).toBe(false);
            expect(defaults.batch!.preserveStructure).toBe(false);
            expect(defaults.batch!.chunkSize).toBe(5);
            expect(defaults.batch!.retryCount).toBe(0);
            expect(defaults.batch!.retryDelay).toBe(1000);
            expect(defaults.batch!.failFast).toBe(false);
        });

        it('should have correct app defaults', () => {
            const defaults = configMapper.getDefaultConfigData();

            expect(defaults.app.notifications).toBe(true);
            expect(defaults.app.sounds).toBe(true);
            expect(defaults.app.autoUpdate).toBe(true);
            expect(defaults.app.startMinimized).toBe(false);
            expect(defaults.app.showInDock).toBe(true);
            expect(defaults.app.rememberWindowSize).toBe(true);
        });
    });

    describe('Schema Validation', () => {
        it('should define schema for input configuration', () => {
            const Store = require('electron-store');
            const schema = Store.mock.calls[0][0].schema;

            expect(schema.input).toBeDefined();
            expect(schema.input.type).toBe('object');
            expect(schema.input.properties.encoding).toBeDefined();
            expect(schema.input.properties.format).toBeDefined();
        });

        it('should define schema for output configuration', () => {
            const Store = require('electron-store');
            const schema = Store.mock.calls[0][0].schema;

            expect(schema.output).toBeDefined();
            expect(schema.output.type).toBe('object');
            expect(schema.output.properties.encoding).toBeDefined();
            expect(schema.output.properties.createBackup).toBeDefined();
            expect(schema.output.properties.bom).toBeDefined();
        });

        it('should define schema for strip configuration', () => {
            const Store = require('electron-store');
            const schema = Store.mock.calls[0][0].schema;

            expect(schema.strip).toBeDefined();
            expect(schema.strip.type).toBe('object');
            expect(schema.strip.properties.html).toBeDefined();
            expect(schema.strip.properties.colors).toBeDefined();
            expect(schema.strip.properties.bidiControl).toBeDefined();
        });

        it('should define schema for batch configuration', () => {
            const Store = require('electron-store');
            const schema = Store.mock.calls[0][0].schema;

            expect(schema.batch).toBeDefined();
            expect(schema.batch.type).toBe('object');
            expect(schema.batch.properties.parallel).toBeDefined();
            expect(schema.batch.properties.chunkSize).toBeDefined();
        });

        it('should define schema for app preferences', () => {
            const Store = require('electron-store');
            const schema = Store.mock.calls[0][0].schema;

            expect(schema.app).toBeDefined();
            expect(schema.app.type).toBe('object');
            expect(schema.app.properties.notifications).toBeDefined();
            expect(schema.app.properties.autoUpdate).toBeDefined();
        });
    });
});
