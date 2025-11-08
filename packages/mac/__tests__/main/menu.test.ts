import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Menu, shell, app } from 'electron';

// Mock Electron modules
jest.mock('electron', () => ({
    Menu: {
        buildFromTemplate: jest.fn((template) => template),
    },
    shell: {
        openExternal: jest.fn(),
    },
    app: {
        getVersion: jest.fn(() => '1.0.0'),
        clearRecentDocuments: jest.fn(),
    },
}));

interface IMenuItem {
    label?: string;
    role?: string;
    accelerator?: string;
    click?: () => void;
    type?: string;
    submenu?: IMenuItem[];
    [key: string]: unknown;
}

interface IMenuTemplate extends Array<IMenuItem> {}

interface IMockAppInstance {
    createPreferencesWindow: jest.Mock<() => void>;
    openFiles: jest.Mock<() => void>;
    clearFileList: jest.Mock<() => void>;
    getMainWindow: () => { webContents: { send: jest.Mock } } | null;
}

describe('Menu - Application Menu Bar', () => {
    let mockAppInstance: IMockAppInstance;
    let mockMainWindow: { webContents: { send: jest.Mock } };

    beforeEach(() => {
        jest.clearAllMocks();

        // Create a stable mock window object
        mockMainWindow = {
            webContents: {
                send: jest.fn(),
            },
        };

        mockAppInstance = {
            createPreferencesWindow: jest.fn(),
            openFiles: jest.fn(),
            clearFileList: jest.fn(),
            getMainWindow: jest.fn(() => mockMainWindow),
        };
    });

    // Helper functions to reduce repetition
    const getTemplate = (): IMenuTemplate => {
        return (Menu.buildFromTemplate as jest.Mock).mock.calls[0][0] as IMenuTemplate;
    };

    const findMenu = (template: IMenuTemplate, label: string): IMenuItem | undefined => {
        return template.find((item) => item.label === label);
    };

    const findMenuItem = (menu: IMenuItem | undefined, label: string): IMenuItem | undefined => {
        return menu?.submenu?.find((item) => item.label === label);
    };

    const getMenuTemplate = async (): Promise<IMenuTemplate> => {
        const { createMenu } = await import('../../src/main/menu');

        createMenu(mockAppInstance);

        return getTemplate();
    };

    describe('Menu Creation', () => {
        it('should create menu with all sections', async () => {
            const { createMenu } = await import('../../src/main/menu');
            const menu = createMenu(mockAppInstance);

            expect(Menu.buildFromTemplate).toHaveBeenCalled();
            expect(menu).toBeDefined();
        });

        it('should have Subzilla menu section', async () => {
            await getMenuTemplate();

            const template = getTemplate();
            const subzillaMenu = findMenu(template, 'Subzilla');

            expect(subzillaMenu).toBeDefined();
            expect(subzillaMenu?.submenu).toBeDefined();
        });

        it('should have File menu section', async () => {
            await getMenuTemplate();

            const template = getTemplate();
            const fileMenu = findMenu(template, 'File');

            expect(fileMenu).toBeDefined();
            expect(fileMenu?.submenu).toBeDefined();
        });

        it('should have Edit menu section', async () => {
            await getMenuTemplate();

            const template = getTemplate();
            const editMenu = findMenu(template, 'Edit');

            expect(editMenu).toBeDefined();
        });

        it('should have View menu section', async () => {
            await getMenuTemplate();

            const template = getTemplate();
            const viewMenu = findMenu(template, 'View');

            expect(viewMenu).toBeDefined();
        });

        it('should have Window menu section', async () => {
            await getMenuTemplate();

            const template = getTemplate();
            const windowMenu = findMenu(template, 'Window');

            expect(windowMenu).toBeDefined();
        });

        it('should have Help menu section', async () => {
            await getMenuTemplate();

            const template = getTemplate();
            const helpMenu = findMenu(template, 'Help');

            expect(helpMenu).toBeDefined();
        });
    });

    describe('Subzilla Menu Items', () => {
        it('should have About Subzilla menu item', async () => {
            const template = await getMenuTemplate();
            const subzillaMenu = findMenu(template, 'Subzilla');
            const aboutItem = findMenuItem(subzillaMenu, 'About Subzilla');

            expect(aboutItem).toBeDefined();
            expect(aboutItem?.click).toBeDefined();
        });

        it('should open GitHub when About is clicked', async () => {
            const template = await getMenuTemplate();
            const subzillaMenu = findMenu(template, 'Subzilla');
            const aboutItem = findMenuItem(subzillaMenu, 'About Subzilla');

            if (aboutItem?.click) {
                aboutItem.click();
            }

            expect(shell.openExternal).toHaveBeenCalledWith('https://github.com/onyxdevs/subzilla');
        });

        it('should have Preferences menu item with keyboard shortcut', async () => {
            const template = await getMenuTemplate();
            const subzillaMenu = findMenu(template, 'Subzilla');
            const prefsItem = findMenuItem(subzillaMenu, 'Preferences...');

            expect(prefsItem).toBeDefined();
            expect(prefsItem?.accelerator).toBe('Cmd+,');
            expect(prefsItem?.click).toBeDefined();
        });

        it('should open preferences window when Preferences is clicked', async () => {
            const template = await getMenuTemplate();
            const subzillaMenu = findMenu(template, 'Subzilla');
            const prefsItem = findMenuItem(subzillaMenu, 'Preferences...');

            if (prefsItem?.click) {
                prefsItem.click();
            }

            expect(mockAppInstance.createPreferencesWindow).toHaveBeenCalled();
        });

        it('should have Quit menu item', async () => {
            const template = await getMenuTemplate();
            const subzillaMenu = findMenu(template, 'Subzilla');
            const quitItem = findMenuItem(subzillaMenu, 'Quit Subzilla');

            expect(quitItem).toBeDefined();
            expect(quitItem?.role).toBe('quit');
        });

        it('should have Hide/Show menu items', async () => {
            const template = await getMenuTemplate();
            const subzillaMenu = findMenu(template, 'Subzilla');

            const hideItem = findMenuItem(subzillaMenu, 'Hide Subzilla');
            const hideOthersItem = findMenuItem(subzillaMenu, 'Hide Others');
            const showAllItem = findMenuItem(subzillaMenu, 'Show All');

            expect(hideItem).toBeDefined();
            expect(hideItem?.role).toBe('hide');
            expect(hideOthersItem).toBeDefined();
            expect(hideOthersItem?.role).toBe('hideOthers');
            expect(showAllItem).toBeDefined();
            expect(showAllItem?.role).toBe('unhide');
        });
    });

    describe('File Menu Items', () => {
        it('should have Open Files menu item with keyboard shortcut', async () => {
            const template = await getMenuTemplate();
            const fileMenu = findMenu(template, 'File');
            const openItem = findMenuItem(fileMenu, 'Open Files...');

            expect(openItem).toBeDefined();
            expect(openItem?.accelerator).toBe('Cmd+O');
            expect(openItem?.click).toBeDefined();
        });

        it('should trigger file opening when Open Files is clicked', async () => {
            const template = await getMenuTemplate();
            const fileMenu = findMenu(template, 'File');
            const openItem = findMenuItem(fileMenu, 'Open Files...');

            if (openItem?.click) {
                openItem.click();
            }

            expect(mockAppInstance.openFiles).toHaveBeenCalled();
        });

        it('should have Open Recent submenu', async () => {
            const template = await getMenuTemplate();
            const fileMenu = findMenu(template, 'File');
            const recentItem = findMenuItem(fileMenu, 'Open Recent');

            expect(recentItem).toBeDefined();
            expect(recentItem?.submenu).toBeDefined();
        });

        it('should clear recent documents when Clear Menu is clicked', async () => {
            const template = await getMenuTemplate();
            const fileMenu = findMenu(template, 'File');
            const recentItem = findMenuItem(fileMenu, 'Open Recent');
            const clearItem = recentItem?.submenu?.find((item) => item.label === 'Clear Menu');

            if (clearItem?.click) {
                clearItem.click();
            }

            expect(app.clearRecentDocuments).toHaveBeenCalled();
        });

        it('should have Clear List menu item with keyboard shortcut', async () => {
            const template = await getMenuTemplate();
            const fileMenu = findMenu(template, 'File');
            const clearItem = findMenuItem(fileMenu, 'Clear List');

            expect(clearItem).toBeDefined();
            expect(clearItem?.accelerator).toBe('Cmd+Delete');
            expect(clearItem?.click).toBeDefined();
        });

        it('should trigger file list clearing when Clear List is clicked', async () => {
            const template = await getMenuTemplate();
            const fileMenu = findMenu(template, 'File');
            const clearItem = findMenuItem(fileMenu, 'Clear List');

            if (clearItem?.click) {
                clearItem.click();
            }

            expect(mockAppInstance.clearFileList).toHaveBeenCalled();
        });

        it('should have Close Window menu item', async () => {
            const template = await getMenuTemplate();
            const fileMenu = findMenu(template, 'File');
            const closeItem = findMenuItem(fileMenu, 'Close Window');

            expect(closeItem).toBeDefined();
            expect(closeItem?.role).toBe('close');
        });
    });

    describe('Edit Menu Items', () => {
        it('should have standard edit menu items', async () => {
            const template = await getMenuTemplate();
            const editMenu = findMenu(template, 'Edit');

            const undoItem = findMenuItem(editMenu, 'Undo');
            const redoItem = findMenuItem(editMenu, 'Redo');
            const cutItem = findMenuItem(editMenu, 'Cut');
            const copyItem = findMenuItem(editMenu, 'Copy');
            const pasteItem = findMenuItem(editMenu, 'Paste');
            const selectAllItem = findMenuItem(editMenu, 'Select All');

            expect(undoItem).toBeDefined();
            expect(undoItem?.role).toBe('undo');
            expect(redoItem).toBeDefined();
            expect(redoItem?.role).toBe('redo');
            expect(cutItem).toBeDefined();
            expect(cutItem?.role).toBe('cut');
            expect(copyItem).toBeDefined();
            expect(copyItem?.role).toBe('copy');
            expect(pasteItem).toBeDefined();
            expect(pasteItem?.role).toBe('paste');
            expect(selectAllItem).toBeDefined();
            expect(selectAllItem?.role).toBe('selectAll');
        });
    });

    describe('View Menu Items', () => {
        it('should have developer tools items', async () => {
            const template = await getMenuTemplate();
            const viewMenu = findMenu(template, 'View');

            const reloadItem = findMenuItem(viewMenu, 'Reload');
            const forceReloadItem = findMenuItem(viewMenu, 'Force Reload');
            const devToolsItem = findMenuItem(viewMenu, 'Toggle Developer Tools');

            expect(reloadItem).toBeDefined();
            expect(reloadItem?.role).toBe('reload');
            expect(forceReloadItem).toBeDefined();
            expect(forceReloadItem?.role).toBe('forceReload');
            expect(devToolsItem).toBeDefined();
            expect(devToolsItem?.role).toBe('toggleDevTools');
        });

        it('should have zoom controls', async () => {
            const template = await getMenuTemplate();
            const viewMenu = findMenu(template, 'View');

            const resetZoomItem = findMenuItem(viewMenu, 'Actual Size');
            const zoomInItem = findMenuItem(viewMenu, 'Zoom In');
            const zoomOutItem = findMenuItem(viewMenu, 'Zoom Out');

            expect(resetZoomItem).toBeDefined();
            expect(resetZoomItem?.role).toBe('resetZoom');
            expect(zoomInItem).toBeDefined();
            expect(zoomInItem?.role).toBe('zoomIn');
            expect(zoomOutItem).toBeDefined();
            expect(zoomOutItem?.role).toBe('zoomOut');
        });

        it('should have fullscreen toggle', async () => {
            const template = await getMenuTemplate();
            const viewMenu = findMenu(template, 'View');
            const fullscreenItem = findMenuItem(viewMenu, 'Toggle Fullscreen');

            expect(fullscreenItem).toBeDefined();
            expect(fullscreenItem?.role).toBe('togglefullscreen');
        });
    });

    describe('Window Menu Items', () => {
        it('should have window management items', async () => {
            const template = await getMenuTemplate();
            const windowMenu = findMenu(template, 'Window');

            const minimizeItem = findMenuItem(windowMenu, 'Minimize');
            const closeItem = findMenuItem(windowMenu, 'Close');
            const frontItem = findMenuItem(windowMenu, 'Bring All to Front');

            expect(minimizeItem).toBeDefined();
            expect(minimizeItem?.role).toBe('minimize');
            expect(closeItem).toBeDefined();
            expect(closeItem?.role).toBe('close');
            expect(frontItem).toBeDefined();
            expect(frontItem?.role).toBe('front');
        });
    });

    describe('Help Menu Items', () => {
        it('should have help links', async () => {
            const template = await getMenuTemplate();
            const helpMenu = findMenu(template, 'Help');

            const helpItem = findMenuItem(helpMenu, 'Subzilla Help');
            const issueItem = findMenuItem(helpMenu, 'Report Issue');

            expect(helpItem).toBeDefined();
            expect(helpItem?.click).toBeDefined();
            expect(issueItem).toBeDefined();
            expect(issueItem?.click).toBeDefined();
        });

        it('should open help wiki when help is clicked', async () => {
            const template = await getMenuTemplate();
            const helpMenu = findMenu(template, 'Help');
            const helpItem = findMenuItem(helpMenu, 'Subzilla Help');

            if (helpItem?.click) {
                helpItem.click();
            }

            expect(shell.openExternal).toHaveBeenCalledWith('https://github.com/onyxdevs/subzilla/wiki');
        });

        it('should open issue tracker when report issue is clicked', async () => {
            const template = await getMenuTemplate();
            const helpMenu = findMenu(template, 'Help');
            const issueItem = findMenuItem(helpMenu, 'Report Issue');

            if (issueItem?.click) {
                issueItem.click();
            }

            expect(shell.openExternal).toHaveBeenCalledWith('https://github.com/onyxdevs/subzilla/issues');
        });

        it('should have keyboard shortcuts menu item', async () => {
            const template = await getMenuTemplate();
            const helpMenu = findMenu(template, 'Help');
            const shortcutsItem = findMenuItem(helpMenu, 'Keyboard Shortcuts');

            expect(shortcutsItem).toBeDefined();
            expect(shortcutsItem?.click).toBeDefined();
        });

        it('should send show-shortcuts event when keyboard shortcuts is clicked', async () => {
            const template = await getMenuTemplate();
            const helpMenu = findMenu(template, 'Help');
            const shortcutsItem = findMenuItem(helpMenu, 'Keyboard Shortcuts');

            if (shortcutsItem?.click) {
                shortcutsItem.click();
            }

            expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('show-shortcuts');
        });
    });

    describe('Menu Separators', () => {
        it('should have separators in Subzilla menu', async () => {
            const template = await getMenuTemplate();
            const subzillaMenu = findMenu(template, 'Subzilla');
            const separators = subzillaMenu?.submenu?.filter((item) => item.type === 'separator') ?? [];

            expect(separators.length).toBeGreaterThan(0);
        });

        it('should have separators in File menu', async () => {
            const template = await getMenuTemplate();
            const fileMenu = findMenu(template, 'File');
            const separators = fileMenu?.submenu?.filter((item) => item.type === 'separator') ?? [];

            expect(separators.length).toBeGreaterThan(0);
        });

        it('should have separators in View menu', async () => {
            const template = await getMenuTemplate();
            const viewMenu = findMenu(template, 'View');
            const separators = viewMenu?.submenu?.filter((item) => item.type === 'separator') ?? [];

            expect(separators.length).toBeGreaterThan(0);
        });
    });
});
