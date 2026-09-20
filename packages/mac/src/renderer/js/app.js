// Main application logic for Subzilla Mac
class SubzillaApp {
    constructor() {
        console.log('🦎 Initializing Subzilla renderer...');

        this.files = new Map(); // Map<string, FileProcessingItem>
        this.isProcessing = false;
        this.currentState = 'empty'; // 'empty', 'processing', 'completed'

        this.initializeElements();
        this.setupEventListeners();
        this.setupIPC();
        this.loadInitialState();
    }

    initializeElements() {
        // State containers
        this.emptyState = document.getElementById('empty-state');
        this.processingState = document.getElementById('processing-state');

        // Interactive elements
        this.browseButton = document.getElementById('browse-button');
        this.fileInput = document.getElementById('file-input');
        this.clearButton = document.getElementById('clear-button');
        this.addMoreButton = document.getElementById('add-more-button');
        this.preferencesButton = document.getElementById('preferences-button');

        // Display elements
        this.fileList = document.getElementById('file-list');
        this.progressBar = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.statusBar = document.getElementById('status-bar');
        this.statusText = document.getElementById('status-text');

        // Overlays
        this.dropOverlay = document.getElementById('drop-overlay');
        this.shortcutsOverlay = document.getElementById('shortcuts-overlay');
        this.closeShortcuts = document.getElementById('close-shortcuts');
    }

    setupEventListeners() {
        // Browse button
        this.browseButton.addEventListener('click', () => this.openFileDialog());
        this.addMoreButton.addEventListener('click', () => this.openFileDialog());

        // File input
        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));

        // Clear button
        this.clearButton.addEventListener('click', () => this.clearFileList());

        // Preferences
        this.preferencesButton.addEventListener('click', () => this.openPreferences());

        // Shortcuts overlay
        this.closeShortcuts.addEventListener('click', () => this.hideShortcuts());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Drag and drop
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const body = document.body;
        let dragCounter = 0;

        // Prevent default drag behaviors on document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());

        // Body drag events
        body.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            body.classList.add('drag-over');
        });

        body.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                body.classList.remove('drag-over');
            }
        });

        body.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        body.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            body.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files);
            this.handleDroppedFiles(files);
        });
    }

    setupIPC() {
        // File opened from system
        window.subzilla.onFileOpened((filePath) => {
            // Same path as a drop: validates, expands folders and starts processing
            this.addFiles([filePath]);
        });

        // Menu actions
        window.subzilla.onOpenFilesDialog(() => this.openFileDialog());
        window.subzilla.onClearFileList(() => this.clearFileList());
        window.subzilla.onShowShortcuts(() => this.showShortcuts());

        // Processing progress
        window.subzilla.onProcessingProgress((progress) => {
            this.updateProgress(progress);
        });

        // Update download progress
        window.subzilla.onUpdateDownloadProgress((progress) => {
            this.updateStatus(`Downloading update: ${progress.percent}%`);
        });
    }

    async loadInitialState() {
        try {
            const appName = await window.subzilla.getAppName();
            const version = await window.subzilla.getAppVersion();
            console.log(`🚀 ${appName} v${version} ready`);

            this.updateStatus('Ready');
        } catch (error) {
            console.error('❌ Error loading initial state:', error);
        }
    }

    async openFileDialog() {
        try {
            const result = await window.subzilla.showOpenDialog();
            if (!result.canceled && result.filePaths.length > 0) {
                this.addFiles(result.filePaths);
            }
        } catch (error) {
            console.error('❌ Error opening file dialog:', error);
            this.showError('Failed to open file dialog');
        }
    }

    async handleFileSelection(event) {
        const files = Array.from(event.target.files);
        const filePaths = files.map((file) => window.subzilla.getPathForFile(file)).filter(Boolean);
        this.addFiles(filePaths);

        // Reset file input
        event.target.value = '';
    }

    async handleDroppedFiles(files) {
        // Works for folders too: a dropped directory arrives as a File whose
        // path is the directory; the main process expands it recursively.
        const filePaths = files.map((file) => window.subzilla.getPathForFile(file)).filter(Boolean);
        console.log(`📁 Handling ${files.length} dropped items:`, filePaths);
        this.addFiles(filePaths);
    }

    async addFiles(filePaths) {
        try {
            console.log(`📁 Adding ${filePaths.length} items...`);

            // Validate files (folders are expanded into the subtitles inside them)
            const validation = await window.subzilla.validateFiles(filePaths);

            if (validation.invalidFiles.length > 0) {
                this.showError(`${validation.invalidFiles.length} files skipped (unsupported format)`);
            } else if (validation.validFiles.length === 0 && validation.scannedDirectories > 0) {
                this.showError('No subtitle files found in the dropped folder');
            }

            // Add valid files, ignoring ones already waiting in the queue
            const queued = new Set(
                Array.from(this.files.values())
                    .filter((f) => f.status === 'pending' || f.status === 'processing')
                    .map((f) => f.filePath),
            );

            for (const filePath of validation.validFiles) {
                if (!queued.has(filePath)) {
                    this.addFile(filePath);
                }
            }

            // Switch to processing state if we have files
            if (this.files.size > 0) {
                this.switchState('processing');
                this.startProcessing();
            }
        } catch (error) {
            console.error('❌ Error adding files:', error);
            this.showError('Failed to add files');
        }
    }

    addFile(filePath) {
        const fileName = filePath.split('/').pop() || filePath;
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const fileItem = {
            id: fileId,
            filePath,
            fileName,
            status: 'pending',
            originalEncoding: undefined,
            resultEncoding: undefined,
            error: undefined,
        };

        this.files.set(fileId, fileItem);
        this.renderFileList();

        console.log(`📄 Added file: ${fileName}`);
    }

    async startProcessing() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        // Only process files that are pending (not already processed)
        const pendingFiles = Array.from(this.files.values()).filter((f) => f.status === 'pending');

        if (pendingFiles.length === 0) {
            console.log('ℹ️ No pending files to process');
            this.isProcessing = false;
            return;
        }

        console.log(`🔄 Starting processing of ${pendingFiles.length} pending files...`);
        this.updateStatus(`Processing ${pendingFiles.length} files...`);

        // Use the FileProcessingManager for individual file processing with UI updates
        if (window.fileProcessingManager) {
            await window.fileProcessingManager.processFiles(pendingFiles);

            // Calculate final stats from ALL files (not just pending)
            const allFiles = Array.from(this.files.values());
            const completed = allFiles.filter((f) => f.status === 'completed').length;
            const failed = allFiles.filter((f) => f.status === 'error').length;

            this.updateStatus(`✓ ${completed} converted, ${failed} failed`);
        }

        this.isProcessing = false;
    }

    markAllCompleted() {
        for (const [, file] of this.files) {
            if (file.status === 'processing' || file.status === 'pending') {
                file.status = 'completed';
                file.resultEncoding = 'UTF-8';
            }
        }
        this.renderFileList();
    }

    updateProgress(progress) {
        const percent = Math.round((progress.current / progress.total) * 100);
        this.progressBar.style.width = `${percent}%`;
        this.progressText.textContent = `${progress.current} of ${progress.total} files`;

        if (progress.currentFile) {
            this.updateStatus(`Processing: ${progress.currentFile}`);
        }
    }

    renderFileList() {
        this.fileList.innerHTML = '';

        for (const file of this.files.values()) {
            const fileElement = this.createFileElement(file);
            this.fileList.appendChild(fileElement);
        }
    }

    createFileElement(file) {
        const element = document.createElement('div');
        element.className = `file-item ${file.status}`;
        element.dataset.fileId = file.id;

        const statusIcon = this.getStatusIcon(file.status);
        const statusText = this.getStatusText(file.status);

        element.innerHTML = `
            <div class="file-name"></div>
            <div class="file-status status-${file.status}">
                <span class="status-icon">${statusIcon}</span>
                <span>${statusText}</span>
            </div>
            <div class="encoding-info">${file.originalEncoding || '—'}</div>
            <div class="encoding-info">${file.resultEncoding || '—'}</div>
        `;

        // File names are untrusted text (they may contain <, >, quotes): never
        // interpolate them into markup
        const nameElement = element.querySelector('.file-name');

        nameElement.textContent = file.fileName;
        nameElement.title = file.filePath;

        // Add click handler for completed files
        if (file.status === 'completed') {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => {
                window.subzilla.showInFinder(file.filePath);
            });
        }

        return element;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'pending':
                return '⏸';
            case 'processing':
                return '⟳';
            case 'completed':
                return '✅';
            case 'error':
                return '❌';
            default:
                return '—';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'pending':
                return 'Waiting';
            case 'processing':
                return 'Processing';
            case 'completed':
                return 'Done';
            case 'error':
                return 'Error';
            default:
                return '—';
        }
    }

    switchState(newState) {
        console.log(`🔄 Switching to ${newState} state`);

        // Hide all states
        this.emptyState.classList.add('hidden');
        this.processingState.classList.add('hidden');

        // Show target state
        switch (newState) {
            case 'empty':
                this.emptyState.classList.remove('hidden');
                this.statusBar.classList.add('hidden');
                break;
            case 'processing':
                this.processingState.classList.remove('hidden');
                this.statusBar.classList.remove('hidden');
                break;
        }

        this.currentState = newState;
    }

    clearFileList() {
        console.log('🗑️ Clearing file list...');
        this.files.clear();
        this.isProcessing = false;
        this.switchState('empty');
        this.updateStatus('Ready');
    }

    async openPreferences() {
        try {
            await window.subzilla.showPreferences();
        } catch (error) {
            console.error('❌ Error opening preferences:', error);
        }
    }

    showShortcuts() {
        this.shortcutsOverlay.classList.remove('hidden');
    }

    hideShortcuts() {
        this.shortcutsOverlay.classList.add('hidden');
    }

    handleKeyboard(event) {
        // Handle keyboard shortcuts
        if (event.metaKey || event.ctrlKey) {
            switch (event.key) {
                case 'o':
                    event.preventDefault();
                    this.openFileDialog();
                    break;
                case 'Backspace':
                case 'Delete':
                    event.preventDefault();
                    this.clearFileList();
                    break;
                case ',':
                    event.preventDefault();
                    this.openPreferences();
                    break;
            }
        }

        // Space to pause/resume (if processing)
        if (event.key === ' ' && this.isProcessing) {
            event.preventDefault();
            // TODO: Implement pause/resume functionality
        }

        // Escape to close overlays
        if (event.key === 'Escape') {
            this.hideShortcuts();
        }
    }

    updateStatus(message) {
        this.statusText.textContent = message;
        console.log(`📊 Status: ${message}`);
    }

    showError(message) {
        this.updateStatus(`❌ ${message}`);
        console.error(`❌ Error: ${message}`);

        // Show error for 3 seconds, then revert
        setTimeout(() => {
            if (!this.isProcessing) {
                this.updateStatus('Ready');
            }
        }, 3000);
    }

    // Utility methods
    generateFileId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }
}

// Drag and Drop Handler
// eslint-disable-next-line no-unused-vars
class DragDropHandler {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const dropZone = document.body;
        // eslint-disable-next-line no-unused-vars
        let dragCounter = 0;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach((eventName) => {
            dropZone.addEventListener(eventName, () => this.highlight(), false);
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            dropZone.addEventListener(eventName, () => this.unhighlight(), false);
        });

        // Handle dropped files
        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight() {
        document.body.classList.add('drag-over');
    }

    unhighlight() {
        document.body.classList.remove('drag-over');
    }

    async handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            console.log(`📁 Files dropped: ${files.length}`);
            this.app.handleDroppedFiles(Array.from(files));
        }
    }

    isValidSubtitle(filePath) {
        const validExtensions = ['.srt', '.sub', '.ass', '.ssa', '.txt'];
        const ext = filePath.toLowerCase().split('.').pop();
        return validExtensions.includes(`.${ext}`);
    }
}

// File Processing Manager
class FileProcessingManager {
    constructor(app) {
        this.app = app;
        this.processingQueue = [];
        this.isProcessing = false;
    }

    async processFiles(files) {
        if (this.isProcessing) {
            console.log('⚠️ Already processing files');
            return;
        }

        this.isProcessing = true;
        console.log(`🔄 Starting to process ${files.length} files...`);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await this.processFile(file, i + 1, files.length);
            }

            console.log('✅ All files processed');
        } catch (error) {
            console.error('❌ Error during file processing:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async processFile(file, current, total) {
        try {
            // Update file status
            file.status = 'processing';
            this.app.renderFileList();
            this.app.updateProgress({ current: current - 1, total, currentFile: file.fileName });

            // Process the file
            const result = await window.subzilla.processFile(file.filePath);

            if (result.success) {
                file.status = 'completed';
                file.resultEncoding = 'UTF-8';
                console.log(`✅ Processed: ${file.fileName}`);
            } else {
                file.status = 'error';
                file.error = result.error;
                console.error(`❌ Failed to process: ${file.fileName} - ${result.error}`);
            }
        } catch (error) {
            file.status = 'error';
            file.error = error.message;
            console.error(`❌ Error processing ${file.fileName}:`, error);
        }

        // Update UI
        this.app.renderFileList();
        this.app.updateProgress({ current, total });
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, starting Subzilla App...');

    window.subzillaApp = new SubzillaApp();
    // window.dragDropHandler = new DragDropHandler(window.subzillaApp); // Disabled - main app handles drag/drop
    window.fileProcessingManager = new FileProcessingManager(window.subzillaApp);

    console.log('✅ Subzilla App initialized successfully');
});
