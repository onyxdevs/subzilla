import path from 'path';

import { ipcMain, dialog, shell, app } from 'electron';

import { SubtitleProcessor, BatchProcessor } from '@subzilla/core';
import { IConfig, IConvertOptions, IBatchStats } from '@subzilla/types';

import { expandPaths, SUPPORTED_EXTENSIONS } from './files';
import { ConfigMapper } from './preferences';

export interface IFileProcessingItem {
    id: string;
    filePath: string;
    fileName: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    originalEncoding?: string;
    resultEncoding?: string;
    error?: string;
}

export interface IProcessingProgress {
    current: number;
    total: number;
    currentFile?: string;
    stats: IBatchStats;
}

export function setupIPC(appInstance: {
    createPreferencesWindow: () => void;
    getPreferencesWindow: () => { close: () => void } | null;
}): void {
    console.log('🔗 Setting up IPC handlers...');

    const processor = new SubtitleProcessor();
    const batchProcessor = new BatchProcessor();
    const configMapper = new ConfigMapper();

    // File dialog handlers
    ipcMain.handle('show-open-dialog', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select Subtitle Files or Folders',
            filters: [
                { name: 'Subtitle Files', extensions: SUPPORTED_EXTENSIONS.map((ext) => ext.slice(1)) },
                { name: 'All Files', extensions: ['*'] },
            ],
            // macOS lets one dialog pick files and folders alike
            properties: ['openFile', 'openDirectory', 'multiSelections'],
        });

        return result;
    });

    // File validation
    ipcMain.handle('validate-files', async (_, filePaths: string[]) => {
        // Folders are expanded recursively into the subtitle files they contain
        return expandPaths(filePaths);
    });

    // Single file processing
    ipcMain.handle('process-file', async (_, filePath: string, options?: IConvertOptions) => {
        try {
            const fileName = path.basename(filePath);

            // Skip files that are already processed
            if (fileName.includes('.subzilla.')) {
                console.log(`⏭️ Skipping already processed file: ${fileName}`);

                return {
                    success: false,
                    error: 'File has already been processed by Subzilla',
                };
            }

            console.log(`🔄 Processing file: ${filePath}`);

            const config = await configMapper.getConfig();
            const processOptions: IConvertOptions = {
                ...config.output,
                ...(config.strip && { strip: config.strip }),
                // Map config field names to processor option names
                backupOriginal: config.output?.createBackup ?? false,
                overwriteBackup: config.output?.overwriteBackup ?? true,
                ...options,
            };

            const result = await processor.processFile(filePath, undefined, processOptions);

            console.log(`✅ File processed successfully: ${result.outputPath}`);

            return {
                success: true,
                outputPath: result.outputPath,
                backupPath: result.backupPath,
            };
        } catch (error) {
            console.error(`❌ Error processing file ${filePath}:`, error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });

    // Batch file processing
    ipcMain.handle('process-files-batch', async (event, filePaths: string[], options?: IConvertOptions) => {
        try {
            console.log(`🔄 Starting batch processing of ${filePaths.length} files...`);

            const config = await configMapper.getConfig();
            const batchOptions = {
                common: {
                    ...config.output,
                    ...(config.strip && { strip: config.strip }),
                    // Map config field names to processor option names
                    backupOriginal: config.output?.createBackup ?? false,
                    overwriteBackup: config.output?.overwriteBackup ?? true,
                    ...options,
                },
                batch: {
                    recursive: false,
                    parallel: config.batch?.parallel ?? true,
                    skipExisting: config.batch?.skipExisting ?? false,
                    chunkSize: config.batch?.chunkSize ?? 5,
                    preserveStructure: false,
                },
            };

            // Set up progress reporting (currently unused but available for future use)
            // const sendProgress = (progress: IProcessingProgress): void => {
            //     event.sender.send('processing-progress', progress);
            // };

            // Process files
            const stats = await batchProcessor.processBatch(filePaths.join(','), batchOptions);

            console.log(`✅ Batch processing completed. Success: ${stats.successful}, Failed: ${stats.failed}`);

            return {
                success: true,
                stats,
            };
        } catch (error) {
            console.error('❌ Error in batch processing:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });

    // Configuration handlers
    ipcMain.handle('get-config', async () => {
        try {
            return await configMapper.getConfig();
        } catch (error) {
            console.error('❌ Error getting config:', error);

            return configMapper.getDefaultConfigData();
        }
    });

    ipcMain.handle('save-config', async (_, config: IConfig) => {
        try {
            await configMapper.saveConfig(config);
            console.log('💾 Configuration saved successfully');

            return { success: true };
        } catch (error) {
            console.error('❌ Error saving config:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });

    ipcMain.handle('reset-config', async () => {
        try {
            await configMapper.resetConfig();
            console.log('🔄 Configuration reset to defaults');

            return { success: true };
        } catch (error) {
            console.error('❌ Error resetting config:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    });

    // Window management
    ipcMain.handle('show-preferences', () => {
        appInstance.createPreferencesWindow();
    });

    ipcMain.handle('close-preferences', () => {
        const prefsWindow = appInstance.getPreferencesWindow();

        if (prefsWindow) {
            prefsWindow.close();
        }
    });

    // File system operations
    ipcMain.handle('show-in-finder', async (_, filePath: string) => {
        shell.showItemInFolder(filePath);
    });

    ipcMain.handle('open-file-external', async (_, filePath: string) => {
        shell.openPath(filePath);
    });

    // App info
    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('get-app-name', () => {
        return app.getName();
    });

    // Config path for preferences
    ipcMain.handle('get-config-path', () => {
        return configMapper.getConfigPath();
    });

    console.log('✅ IPC handlers setup complete');
}
