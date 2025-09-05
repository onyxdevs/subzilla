# Subzilla Mac Desktop Application

A minimalist Mac desktop application for subtitle conversion, built with Electron and integrated with the Subzilla monorepo.

## Features

- 🦎 **Simple Interface**: Drag-and-drop subtitle files for instant conversion
- ⚡ **Fast Processing**: Leverages `@subzilla/core` for efficient batch processing
- 🎛️ **Full Control**: Complete preferences window with all configuration options
- 🍎 **Native macOS**: Feels like a native Mac application
- 🔄 **Auto-Updates**: Seamless updates through GitHub releases
- 💾 **Smart Backups**: Optional backup creation with conflict handling

## Supported Formats

- **Input**: `.srt`, `.sub`, `.ass`, `.ssa`, `.txt`
- **Output**: UTF-8 encoded files in same or different formats
- **Encoding Detection**: Automatic detection of input encoding
- **Arabic Support**: Optimized for Arabic subtitle processing

## Development

```bash
# Install dependencies
yarn install

# Build TypeScript
yarn build

# Run in development
yarn dev

# Create distribution
yarn dist
```

## Architecture

### Main Process (`src/main/`)

- `index.ts` - Application entry point and window management
- `ipc.ts` - IPC handlers for renderer communication
- `menu.ts` - Native macOS menu bar
- `preferences.ts` - Configuration management with electron-store
- `updater.ts` - Auto-update functionality

### Renderer Process (`src/renderer/`)

- `index.html` - Main window interface
- `preferences.html` - Preferences window
- `js/app.js` - Main application logic and drag-drop
- `js/preferences.js` - Preferences management
- `styles/` - CSS styling for both windows

### Preload (`src/preload/`)

- `index.ts` - Secure context bridge for IPC communication

## Integration

The Mac app directly uses:

- `@subzilla/core` - All processing logic
- `@subzilla/types` - TypeScript interfaces and types

No subprocess calls or CLI wrapping - direct integration for maximum performance.

## Distribution

Built with `electron-builder` for:

- **DMG**: Drag-and-drop installer
- **ZIP**: Portable application bundle
- **Auto-updates**: GitHub releases integration

## Security

- Context isolation enabled
- Node integration disabled
- Secure IPC communication
- Code signing and notarization ready
