import { contextBridge, ipcRenderer } from 'electron';
import { IConfig, IConvertOptions, IBatchStats } from '@subzilla/types';

export interface SubzillaAPI {
    // File operations
    showOpenDialog: () => Promise<Electron.OpenDialogReturnValue>;
    validateFiles: (filePaths: string[]) => Promise<{ validFiles: string[]; invalidFiles: string[] }>;
    processFile: (
        filePath: string,
        options?: IConvertOptions,
    ) => Promise<{ success: boolean; outputPath?: string; backupPath?: string; error?: string }>;
    processFilesBatch: (
        filePaths: string[],
        options?: IConvertOptions,
    ) => Promise<{ success: boolean; stats?: IBatchStats; error?: string }>;

    // Configuration
    getConfig: () => Promise<IConfig>;
    saveConfig: (config: IConfig) => Promise<{ success: boolean; error?: string }>;
    resetConfig: () => Promise<{ success: boolean; error?: string }>;

    // Window management
    showPreferences: () => Promise<void>;
    closePreferences: () => Promise<void>;

    // System integration
    showInFinder: (filePath: string) => Promise<void>;
    openFileExternal: (filePath: string) => Promise<void>;

    // App info
    getAppVersion: () => Promise<string>;
    getAppName: () => Promise<string>;
    getConfigPath: () => Promise<string>;

    // Event listeners
    onFileOpened: (callback: (filePath: string) => void) => void;
    onProcessingProgress: (callback: (progress: any) => void) => void;
    onUpdateDownloadProgress: (callback: (progress: any) => void) => void;
    onOpenFilesDialog: (callback: () => void) => void;
    onClearFileList: (callback: () => void) => void;
    onShowShortcuts: (callback: () => void) => void;

    // Event cleanup
    removeAllListeners: (channel: string) => void;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api: SubzillaAPI = {
    // File operations
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
    validateFiles: (filePaths: string[]) => ipcRenderer.invoke('validate-files', filePaths),
    processFile: (filePath: string, options?: IConvertOptions) => ipcRenderer.invoke('process-file', filePath, options),
    processFilesBatch: (filePaths: string[], options?: IConvertOptions) =>
        ipcRenderer.invoke('process-files-batch', filePaths, options),

    // Configuration
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config: IConfig) => ipcRenderer.invoke('save-config', config),
    resetConfig: () => ipcRenderer.invoke('reset-config'),

    // Window management
    showPreferences: () => ipcRenderer.invoke('show-preferences'),
    closePreferences: () => ipcRenderer.invoke('close-preferences'),

    // System integration
    showInFinder: (filePath: string) => ipcRenderer.invoke('show-in-finder', filePath),
    openFileExternal: (filePath: string) => ipcRenderer.invoke('open-file-external', filePath),

    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppName: () => ipcRenderer.invoke('get-app-name'),
    getConfigPath: () => ipcRenderer.invoke('get-config-path'),

    // Event listeners
    onFileOpened: (callback: (filePath: string) => void) => {
        ipcRenderer.on('file-opened', (_, filePath) => callback(filePath));
    },
    onProcessingProgress: (callback: (progress: any) => void) => {
        ipcRenderer.on('processing-progress', (_, progress) => callback(progress));
    },
    onUpdateDownloadProgress: (callback: (progress: any) => void) => {
        ipcRenderer.on('update-download-progress', (_, progress) => callback(progress));
    },
    onOpenFilesDialog: (callback: () => void) => {
        ipcRenderer.on('open-files-dialog', () => callback());
    },
    onClearFileList: (callback: () => void) => {
        ipcRenderer.on('clear-file-list', () => callback());
    },
    onShowShortcuts: (callback: () => void) => {
        ipcRenderer.on('show-shortcuts', () => callback());
    },

    // Event cleanup
    removeAllListeners: (channel: string) => {
        ipcRenderer.removeAllListeners(channel);
    },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('subzilla', api);

console.log('🔒 Context bridge established successfully');
