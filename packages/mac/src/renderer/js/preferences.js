// Preferences window logic for Subzilla Mac
class PreferencesApp {
    constructor() {
        console.log('⚙️ Initializing Preferences...');

        this.config = null;
        this.originalConfig = null;
        this.hasChanges = false;

        this.initializeElements();
        this.setupEventListeners();
        this.loadConfiguration();
        this.loadAppInfo();
        this.loadConfigPath();
    }

    initializeElements() {
        // Tab navigation
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabPanes = document.querySelectorAll('.tab-pane');

        // General tab
        this.createBackup = document.getElementById('create-backup');
        this.overwriteBackup = document.getElementById('overwrite-backup');
        this.overwriteInput = document.getElementById('overwrite-input');

        // Formatting tab
        this.presetButtons = document.querySelectorAll('.preset-button');
        this.stripHtml = document.getElementById('strip-html');
        this.stripColors = document.getElementById('strip-colors');
        this.stripStyles = document.getElementById('strip-styles');
        this.stripUrls = document.getElementById('strip-urls');
        this.stripTimestamps = document.getElementById('strip-timestamps');
        this.stripNumbers = document.getElementById('strip-numbers');
        this.stripPunctuation = document.getElementById('strip-punctuation');
        this.stripEmojis = document.getElementById('strip-emojis');
        this.stripBrackets = document.getElementById('strip-brackets');
        this.stripBidiControl = document.getElementById('strip-bidi-control');

        // Output tab
        this.outputEncoding = document.getElementById('output-encoding');
        this.outputBom = document.getElementById('output-bom');
        this.lineEndings = document.getElementById('line-endings');
        this.outputFormat = document.getElementById('output-format');

        // Processing tab
        this.parallelProcessing = document.getElementById('parallel-processing');
        this.chunkSize = document.getElementById('chunk-size');

        // Advanced tab
        this.configPath = document.getElementById('config-path');
        this.showConfigButton = document.getElementById('show-config-button');
        this.resetConfigButton = document.getElementById('reset-config-button');
        this.appName = document.getElementById('app-name');
        this.appVersion = document.getElementById('app-version');
        this.githubLink = document.getElementById('github-link');
        this.reportIssueLink = document.getElementById('report-issue-link');

        // Actions
        this.cancelButton = document.getElementById('cancel-button');
        this.saveButton = document.getElementById('save-button');
    }

    setupEventListeners() {
        // Tab navigation
        this.tabButtons.forEach((button) => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Preset buttons
        this.presetButtons.forEach((button) => {
            button.addEventListener('click', () => this.applyPreset(button.dataset.preset));
        });

        // Form change detection
        const formElements = [
            this.createBackup,
            this.overwriteBackup,
            this.overwriteInput,
            this.stripHtml,
            this.stripColors,
            this.stripStyles,
            this.stripUrls,
            this.stripTimestamps,
            this.stripNumbers,
            this.stripPunctuation,
            this.stripEmojis,
            this.stripBrackets,
            this.stripBidiControl,
            this.outputEncoding,
            this.outputBom,
            this.lineEndings,
            this.outputFormat,
            this.parallelProcessing,
            this.chunkSize,
        ];

        formElements.forEach((element) => {
            if (element) {
                element.addEventListener('change', () => this.markChanged());
            }
        });

        // Action buttons
        this.showConfigButton.addEventListener('click', () => this.showConfigInFinder());
        this.resetConfigButton.addEventListener('click', () => this.resetConfiguration());
        this.githubLink.addEventListener('click', () => this.openGitHub());
        this.reportIssueLink.addEventListener('click', () => this.openIssueTracker());
        this.cancelButton.addEventListener('click', () => this.cancel());
        this.saveButton.addEventListener('click', () => this.save());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    switchTab(tabName) {
        // Update tab buttons
        this.tabButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        // Update tab panes
        this.tabPanes.forEach((pane) => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });

        console.log(`📑 Switched to ${tabName} tab`);
    }

    async loadConfiguration() {
        try {
            console.log('📖 Loading configuration...');
            this.config = await window.subzilla.getConfig();
            this.originalConfig = JSON.parse(JSON.stringify(this.config));

            this.populateForm();
            console.log('✅ Configuration loaded');
        } catch (error) {
            console.error('❌ Error loading configuration:', error);
        }
    }

    async loadAppInfo() {
        try {
            const name = await window.subzilla.getAppName();
            const version = await window.subzilla.getAppVersion();

            this.appName.textContent = name;
            this.appVersion.textContent = `v${version}`;
        } catch (error) {
            console.error('❌ Error loading app info:', error);
        }
    }

    async loadConfigPath() {
        try {
            const configPath = await window.subzilla.getConfigPath();
            this.configPath.textContent = configPath;
        } catch (error) {
            console.error('❌ Error loading config path:', error);
            this.configPath.textContent = 'Unknown';
        }
    }

    populateForm() {
        if (!this.config) return;

        // General tab
        this.createBackup.checked = this.config.output?.createBackup ?? false;
        this.overwriteBackup.checked = this.config.output?.overwriteBackup ?? false;
        this.overwriteInput.checked = this.config.output?.overwriteInput ?? false;

        // Formatting tab - strip options
        if (this.config.strip) {
            this.stripHtml.checked = this.config.strip.html ?? false;
            this.stripColors.checked = this.config.strip.colors ?? false;
            this.stripStyles.checked = this.config.strip.styles ?? false;
            this.stripUrls.checked = this.config.strip.urls ?? false;
            this.stripTimestamps.checked = this.config.strip.timestamps ?? false;
            this.stripNumbers.checked = this.config.strip.numbers ?? false;
            this.stripPunctuation.checked = this.config.strip.punctuation ?? false;
            this.stripEmojis.checked = this.config.strip.emojis ?? false;
            this.stripBrackets.checked = this.config.strip.brackets ?? false;
            this.stripBidiControl.checked = this.config.strip.bidiControl ?? true;
        }

        // Output tab
        this.outputEncoding.value = this.config.output?.encoding ?? 'utf8';
        this.outputBom.checked = this.config.output?.bom ?? true;
        this.lineEndings.value = this.config.output?.lineEndings ?? 'auto';
        this.outputFormat.value = this.config.output?.format ?? 'srt';

        // Processing tab
        this.parallelProcessing.checked = this.config.batch?.parallel ?? true;
        this.chunkSize.value = this.config.batch?.chunkSize?.toString() ?? '5';

        this.updatePresetButtons();
    }

    gatherFormData() {
        const config = {
            input: {
                encoding: 'auto',
                format: 'auto',
            },
            output: {
                encoding: this.outputEncoding.value,
                createBackup: this.createBackup.checked,
                overwriteBackup: this.overwriteBackup.checked,
                bom: this.outputBom.checked,
                lineEndings: this.lineEndings.value,
                format: this.outputFormat.value,
                overwriteInput: this.overwriteInput.checked,
                overwriteExisting: true, // Always overwrite existing files by default
            },
            strip: {
                html: this.stripHtml.checked,
                colors: this.stripColors.checked,
                styles: this.stripStyles.checked,
                urls: this.stripUrls.checked,
                timestamps: this.stripTimestamps.checked,
                numbers: this.stripNumbers.checked,
                punctuation: this.stripPunctuation.checked,
                emojis: this.stripEmojis.checked,
                brackets: this.stripBrackets.checked,
                bidiControl: this.stripBidiControl.checked,
            },
            batch: {
                recursive: false,
                parallel: this.parallelProcessing.checked,
                skipExisting: false,
                preserveStructure: false,
                chunkSize: parseInt(this.chunkSize.value, 10),
                retryCount: 0,
                retryDelay: 1000,
                failFast: false,
            },
        };

        return config;
    }

    applyPreset(presetName) {
        console.log(`🎛️ Applying preset: ${presetName}`);

        const presets = {
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
                timestamps: true,
                numbers: true,
                punctuation: true,
                emojis: true,
                brackets: true,
                bidiControl: true,
            },
        };

        const preset = presets[presetName];
        if (preset) {
            // Apply preset to checkboxes
            this.stripHtml.checked = preset.html;
            this.stripColors.checked = preset.colors;
            this.stripStyles.checked = preset.styles;
            this.stripUrls.checked = preset.urls;
            this.stripTimestamps.checked = preset.timestamps;
            this.stripNumbers.checked = preset.numbers;
            this.stripPunctuation.checked = preset.punctuation;
            this.stripEmojis.checked = preset.emojis;
            this.stripBrackets.checked = preset.brackets;
            this.stripBidiControl.checked = preset.bidiControl;

            this.updatePresetButtons();
            this.markChanged();
        }
    }

    updatePresetButtons() {
        const currentStrip = {
            html: this.stripHtml.checked,
            colors: this.stripColors.checked,
            styles: this.stripStyles.checked,
            urls: this.stripUrls.checked,
            timestamps: this.stripTimestamps.checked,
            numbers: this.stripNumbers.checked,
            punctuation: this.stripPunctuation.checked,
            emojis: this.stripEmojis.checked,
            brackets: this.stripBrackets.checked,
            bidiControl: this.stripBidiControl.checked,
        };

        // Check which preset matches current settings
        this.presetButtons.forEach((button) => {
            button.classList.remove('active');
        });

        // Find matching preset
        const presets = {
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
                timestamps: true,
                numbers: true,
                punctuation: true,
                emojis: true,
                brackets: true,
                bidiControl: true,
            },
        };

        for (const [presetName, preset] of Object.entries(presets)) {
            if (this.presetsMatch(currentStrip, preset)) {
                const button = document.querySelector(`[data-preset="${presetName}"]`);
                if (button) {
                    button.classList.add('active');
                }
                break;
            }
        }
    }

    presetsMatch(current, preset) {
        return Object.keys(preset).every((key) => current[key] === preset[key]);
    }

    markChanged() {
        this.hasChanges = true;
        this.saveButton.textContent = 'Save Changes';
        this.saveButton.classList.add('primary-button');
    }

    async showConfigInFinder() {
        try {
            const configPath = await window.subzilla.getConfigPath();
            await window.subzilla.showInFinder(configPath);
        } catch (error) {
            console.error('❌ Error showing config in Finder:', error);
        }
    }

    async resetConfiguration() {
        const confirmed = confirm('Are you sure you want to reset all preferences to defaults? This cannot be undone.');
        if (confirmed) {
            try {
                console.log('🔄 Resetting configuration...');
                await window.subzilla.resetConfig();
                await this.loadConfiguration();
                this.hasChanges = false;
                this.saveButton.textContent = 'Save';
                console.log('✅ Configuration reset successfully');
            } catch (error) {
                console.error('❌ Error resetting configuration:', error);
                alert('Failed to reset configuration');
            }
        }
    }

    openGitHub() {
        // This will be handled by the main process
        console.log('🔗 Opening GitHub repository...');
    }

    openIssueTracker() {
        // This will be handled by the main process
        console.log('🔗 Opening issue tracker...');
    }

    async save() {
        try {
            console.log('💾 Saving preferences...');

            const config = this.gatherFormData();
            const result = await window.subzilla.saveConfig(config);

            if (result.success) {
                console.log('✅ Preferences saved successfully');
                this.hasChanges = false;
                this.saveButton.textContent = 'Save';
                this.originalConfig = JSON.parse(JSON.stringify(config));

                // Show brief success feedback
                this.saveButton.textContent = 'Saved!';
                setTimeout(() => {
                    if (!this.hasChanges) {
                        this.saveButton.textContent = 'Save';
                    }
                }, 1000);
            } else {
                console.error('❌ Failed to save preferences:', result.error);
                alert(`Failed to save preferences: ${result.error}`);
            }
        } catch (error) {
            console.error('❌ Error saving preferences:', error);
            alert('Failed to save preferences');
        }
    }

    cancel() {
        if (this.hasChanges) {
            const confirmed = confirm('You have unsaved changes. Are you sure you want to cancel?');
            if (!confirmed) return;
        }

        console.log('❌ Cancelling preferences...');
        window.subzilla.closePreferences();
    }

    handleKeyboard(event) {
        if (event.metaKey || event.ctrlKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    this.save();
                    break;
                case 'w':
                    event.preventDefault();
                    this.cancel();
                    break;
            }
        }

        if (event.key === 'Escape') {
            this.cancel();
        }
    }

    // Utility methods
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize preferences when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, starting Preferences App...');

    window.preferencesApp = new PreferencesApp();

    console.log('✅ Preferences App initialized successfully');
});
