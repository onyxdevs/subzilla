# Mac Desktop Application Tests

Comprehensive test suite for the Subzilla Mac desktop application built with Electron.

## Test Structure

```
__tests__/
├── main/                          # Main process tests
│   ├── index.test.ts             # Application initialization and lifecycle
│   ├── ipc.test.ts               # IPC handlers and communication
│   ├── preferences.test.ts       # Configuration and settings management
│   ├── menu.test.ts              # Application menu bar
│   └── updater.test.ts           # Auto-updater functionality
├── preload/                       # Preload script tests
│   └── index.test.ts             # Context bridge and security
├── integration.test.ts           # Integration tests across components
├── setup.ts                      # Test utilities and helpers
└── README.md                     # This file
```

## Test Coverage

### 1. Main Application (index.test.ts)

- **Application Initialization**: App startup, component setup, event registration
- **Window Management**: Window creation, lifecycle, preferences window
- **File Handling**: File opening from Finder, drag-and-drop support
- **Security**: Secure web preferences, external link handling
- **Application Lifecycle**: Quit behavior, activation, multi-window management

### 2. IPC Handlers (ipc.test.ts)

- **File Operations**: File dialog, validation, single file processing
- **Batch Processing**: Multiple file processing, progress reporting
- **Configuration**: Get, save, reset configuration
- **Window Management**: Show/close preferences window
- **File System**: Show in Finder, open externally
- **App Info**: Version, name, config path
- **Error Handling**: Graceful error handling across all operations

### 3. Preferences (preferences.test.ts)

- **Initialization**: Store setup, default configuration
- **Configuration Management**: Get/save config, app preferences
- **Formatting Presets**: None, Basic Clean, Deep Clean, Arabic Optimized, Maximum Clean
- **Schema Validation**: Type checking for all configuration sections
- **Default Values**: Correct defaults for input, output, strip, batch, and app settings

### 4. Menu (menu.test.ts)

- **Menu Creation**: All menu sections and items
- **Subzilla Menu**: About, Preferences, Services, Hide/Show, Quit
- **File Menu**: Open Files, Open Recent, Clear List, Close Window
- **Edit Menu**: Undo, Redo, Cut, Copy, Paste, Select All
- **View Menu**: Reload, DevTools, Zoom controls, Fullscreen
- **Window Menu**: Minimize, Close, Bring to Front
- **Help Menu**: Help documentation, Report Issue, Keyboard Shortcuts
- **Menu Actions**: Correct handler execution for all clickable items

### 5. Auto-Updater (updater.test.ts)

- **Initialization**: Configuration, auto-check on startup
- **Update Available**: User prompts, download initiation, notifications
- **Download Progress**: Progress reporting, dock badge updates
- **Update Downloaded**: Install prompts, quit and install
- **Error Handling**: Network errors, permission errors
- **Manual Methods**: Check, download, install updates programmatically

### 6. Preload Script (preload/index.test.ts)

- **Context Bridge**: API exposure to renderer
- **File Operations**: All file-related IPC invocations
- **Configuration**: Config get/save/reset
- **Window Management**: Show/close preferences
- **System Integration**: Finder, external file opening
- **Event Listeners**: File opened, progress, shortcuts
- **Security**: Context isolation, limited IPC exposure
- **Type Safety**: Typed return values for all operations

### 7. Integration Tests (integration.test.ts)

- **Startup Flow**: Complete initialization sequence
- **File Processing Workflow**: End-to-end file processing
- **Configuration Workflow**: Config loading and saving
- **Window Management**: Window creation and lifecycle
- **Menu Integration**: Menu actions triggering app functions
- **Error Handling**: Error propagation across components
- **Security**: Security settings enforcement
- **Data Flow**: Data passing between renderer and main process

## Running Tests

### Run all Mac tests

```bash
npm test
# or specifically
npm run test -- --selectProjects mac
```

### Run specific test file

```bash
npm test -- __tests__/main/ipc.test.ts
```

### Run with coverage

```bash
npm test -- --coverage
```

### Run in watch mode

```bash
npm test -- --watch
```

### Run integration tests only

```bash
npm test -- integration.test.ts
```

## Test Patterns

### Unit Tests

- **Isolation**: Each unit test focuses on a single component
- **Mocking**: External dependencies are mocked
- **Assertions**: Clear expectations for behavior

Example:

```typescript
it('should process a single file successfully', async () => {
    const mockResult = { outputPath: '/output.srt' };
    mockProcessor.processFile.mockResolvedValue(mockResult);

    const result = await handler({}, '/input.srt');

    expect(result.success).toBe(true);
    expect(mockProcessor.processFile).toHaveBeenCalled();
});
```

### Integration Tests

- **Component Interaction**: Test how components work together
- **Real Workflows**: Test complete user workflows
- **End-to-End**: From user action to final result

Example:

```typescript
it('should complete file processing workflow', async () => {
    // Validate files
    const validation = await validateHandler({}, ['/file.srt']);
    expect(validation.validFiles).toContain('/file.srt');

    // Process files
    const result = await processHandler({}, '/file.srt');
    expect(result.success).toBe(true);
});
```

## Mocking Strategy

### Electron Modules

All Electron modules are mocked to avoid requiring Electron in tests:

- `app`: Application lifecycle
- `BrowserWindow`: Window management
- `ipcMain`/`ipcRenderer`: IPC communication
- `dialog`: File dialogs
- `shell`: System integration
- `Menu`: Application menu

### Core Modules

Core Subzilla functionality is mocked:

- `SubtitleProcessor`: File processing
- `BatchProcessor`: Batch operations
- `ConfigManager`: Configuration management

### Third-Party

- `electron-store`: Configuration storage
- `electron-updater`: Auto-update functionality

## Test Utilities (setup.ts)

Common test utilities and helpers are provided in `setup.ts`:

- `createMockBrowserWindow()`: Mock Electron window
- `createMockApp()`: Mock Electron app
- `createMockDialog()`: Mock file dialogs
- `createMockIpcMain()`: Mock IPC with handler tracking
- `createMockStore()`: Mock electron-store
- `createMockSubtitleProcessor()`: Mock subtitle processor
- `createMockConfigMapper()`: Mock config manager
- `waitFor()`: Async wait helper
- `waitForCondition()`: Conditional wait helper
- `suppressConsole()`: Hide console output during tests

## Best Practices

1. **Clear Test Names**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly (setup, execute, verify)
3. **Mock External Dependencies**: Keep tests isolated and fast
4. **Test Error Cases**: Don't just test happy paths
5. **Use Helpers**: Utilize test utilities for common operations
6. **Clean Up**: Clear mocks between tests using `beforeEach`/`afterEach`
7. **Type Safety**: Maintain TypeScript types in tests

## Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Common Issues

### Module Resolution

If you encounter module resolution issues:

```bash
npm run build  # Build TypeScript first
npm test       # Then run tests
```

### Electron in Tests

Tests should never require actual Electron - all Electron modules are mocked.

### Async Operations

Always use `async/await` or return promises in tests:

```typescript
it('should handle async operation', async () => {
    const result = await asyncFunction();
    expect(result).toBeDefined();
});
```

## Contributing

When adding new features to the Mac app:

1. Write tests first (TDD approach recommended)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this README if adding new test files

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Electron Testing Guide](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [TypeScript Jest](https://kulshekhar.github.io/ts-jest/)
