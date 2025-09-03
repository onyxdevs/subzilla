import { Menu, MenuItemConstructorOptions, app, shell } from 'electron';

export function createMenu(appInstance: any): Menu {
    console.log('📋 Creating native menu bar...');

    const template: MenuItemConstructorOptions[] = [
        {
            label: 'Subzilla',
            submenu: [
                {
                    label: 'About Subzilla',
                    click: () => {
                        const version = app.getVersion();
                        shell.openExternal(`https://github.com/obadaqawwas/subzilla`);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Preferences...',
                    accelerator: 'Cmd+,',
                    click: () => {
                        appInstance.createPreferencesWindow();
                    }
                },
                { type: 'separator' },
                { label: 'Services', submenu: [] },
                { type: 'separator' },
                { label: 'Hide Subzilla', role: 'hide' },
                { label: 'Hide Others', role: 'hideOthers' },
                { label: 'Show All', role: 'unhide' },
                { type: 'separator' },
                { label: 'Quit Subzilla', role: 'quit' }
            ]
        },
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Files...',
                    accelerator: 'Cmd+O',
                    click: () => {
                        appInstance.openFiles();
                    }
                },
                {
                    label: 'Open Recent',
                    submenu: [
                        { label: 'Clear Menu', click: () => app.clearRecentDocuments() }
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Clear List',
                    accelerator: 'Cmd+Delete',
                    click: () => {
                        appInstance.clearFileList();
                    }
                },
                { type: 'separator' },
                { label: 'Close Window', role: 'close' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { label: 'Undo', role: 'undo' },
                { label: 'Redo', role: 'redo' },
                { type: 'separator' },
                { label: 'Cut', role: 'cut' },
                { label: 'Copy', role: 'copy' },
                { label: 'Paste', role: 'paste' },
                { label: 'Select All', role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { label: 'Reload', role: 'reload' },
                { label: 'Force Reload', role: 'forceReload' },
                { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
                { type: 'separator' },
                { label: 'Actual Size', role: 'resetZoom' },
                { label: 'Zoom In', role: 'zoomIn' },
                { label: 'Zoom Out', role: 'zoomOut' },
                { type: 'separator' },
                { label: 'Toggle Fullscreen', role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { label: 'Minimize', role: 'minimize' },
                { label: 'Close', role: 'close' },
                { type: 'separator' },
                { label: 'Bring All to Front', role: 'front' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Subzilla Help',
                    click: () => {
                        shell.openExternal('https://github.com/obadaqawwas/subzilla/wiki');
                    }
                },
                {
                    label: 'Report Issue',
                    click: () => {
                        shell.openExternal('https://github.com/obadaqawwas/subzilla/issues');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Keyboard Shortcuts',
                    click: () => {
                        // Show keyboard shortcuts overlay
                        const mainWindow = appInstance.getMainWindow();
                        if (mainWindow) {
                            mainWindow.webContents.send('show-shortcuts');
                        }
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    console.log('✅ Menu bar created successfully');
    
    return menu;
}