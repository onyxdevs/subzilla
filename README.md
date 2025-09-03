# SubZilla 🦎

A powerful subtitle file converter that ensures proper UTF-8 encoding with robust support for Arabic and other languages. SubZilla automatically detects the input file encoding and converts it to UTF-8, making it perfect for fixing subtitle encoding issues. Built with SOLID, YAGNI, KISS, and DRY principles in mind.

## Features ✨

- Automatic encoding detection.
- Converts subtitle files to UTF-8.
- Supports multiple subtitle formats (`.srt`, `.sub`, `.txt`).
- Strong support for Arabic and other non-Latin scripts.
- Simple command-line interface.
- Batch processing with glob pattern support.
- Parallel processing for better performance.
- Preserves original file formatting.
- Creates backup of original files.

## Installation 🚀

### Prerequisites

- Node.js (v14 or higher)
- Yarn package manager

### Global Installation

```bash
# Install globally using yarn
yarn global add subzilla

# Or using npm
npm install -g subzilla
```

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/onyxdevs/subzilla.git
cd subzilla

# Install dependencies (installs all workspace packages)
yarn install

# Build all packages
yarn build

# Run the CLI
yarn start

# Development mode (watch for changes)
yarn dev
```

## Usage 💻

### Basic Usage

```bash
# Convert a single subtitle file
subzilla convert path/to/subtitle.srt

# The converted file will be saved as path/to/subtitle.utf8.srt

# Strip HTML formatting
subzilla convert input.srt --strip-html

# Strip color codes
subzilla convert input.srt --strip-colors

# Strip style tags
subzilla convert input.srt --strip-styles

# Replace URLs with [URL]
subzilla convert input.srt --strip-urls

# Strip all formatting
subzilla convert input.srt --strip-all

# Create backup and strip formatting
subzilla convert input.srt -b --strip-all

# Create numbered backups instead of overwriting existing backup
subzilla convert input.srt -b --no-overwrite-backup

# Combine multiple strip options
subzilla convert input.srt --strip-html --strip-colors
```

### Batch Processing

Convert multiple subtitle files at once using glob patterns:

```bash
# Convert all .srt files in current directory
subzilla batch "*.srt"

# Convert files recursively in all subdirectories
subzilla batch "**/*.srt" -r

# Convert multiple formats
subzilla batch "**/*.{srt,sub,txt}" -r

# Specify output directory
subzilla batch "**/*.srt" -o converted/

# Process files in parallel for better performance
subzilla batch "**/*.srt" -p

# Skip existing UTF-8 files
subzilla batch "**/*.srt" -s

# Combine basic options for maximum efficiency
subzilla batch "**/*.{srt,sub,txt}" -r -p -s -o converted/

# Advanced Directory Processing

# Limit recursive depth to 2 levels
subzilla batch "**/*.srt" -r -d 2

# Only process files in specific directories
subzilla batch "**/*.srt" -r -i "movies" "series"

# Exclude specific directories
subzilla batch "**/*.srt" -r -x "temp" "backup"

# Preserve directory structure in output
subzilla batch "**/*.srt" -r -o converted/ --preserve-structure

# Complex example combining all features
subzilla batch "**/*.{srt,sub,txt}" -r -p -s -o converted/ \
  -d 3 -i "movies" "series" -x "temp" "backup" --preserve-structure

# Strip formatting in batch mode
subzilla batch "**/*.srt" -r --strip-all

# Strip specific formatting in batch mode
subzilla batch "**/*.srt" -r --strip-html --strip-colors

# Create backups and strip formatting
subzilla batch "**/*.srt" -r -b --strip-all

# Create numbered backups instead of overwriting existing ones
subzilla batch "**/*.srt" -r -b --no-overwrite-backup --strip-all

# Complex example with formatting options
subzilla batch "**/*.{srt,sub,txt}" -r -p -s -o converted/ \
  -d 3 -i "movies" "series" -x "temp" "backup" \
  --preserve-structure --strip-all -b
```

Options:

- `-o, --output-dir <dir>`: Save converted files to specified directory.
- `-r, --recursive`: Search for files in subdirectories.
- `-p, --parallel`: Process files in parallel (faster for many files).
- `-s, --skip-existing`: Skip files that already have a UTF-8 version.
- `-d, --max-depth <depth>`: Maximum directory depth for recursive search.
- `-i, --include-dirs <dirs...>`: Only process files in these directories.
- `-x, --exclude-dirs <dirs...>`: Exclude files in these directories.
- `--preserve-structure`: Preserve directory structure in output.
- `-b, --backup`: Create backup of original files.
- `--no-overwrite-backup`: Create numbered backups instead of overwriting existing backup.
- `--strip-html`: Strip HTML tags.
- `--strip-colors`: Strip color codes.
- `--strip-styles`: Strip style tags.
- `--strip-urls`: Replace URLs with [URL].
- `--strip-all`: Strip all formatting (equivalent to all strip options).

Features:

- Progress bar showing conversion status.
- Per-directory progress tracking.
- Detailed statistics after completion.
- Error tracking and reporting.
- Parallel processing support.
- Skip existing files option.
- Time tracking and performance metrics.
- Directory structure preservation.
- Directory filtering and depth control.
- HTML tag stripping.
- Color code removal.
- Style tag removal.
- URL replacement.
- Whitespace normalization.
- Original file backup.

Example Output:

```
🔍 Found 25 files in 5 directories...

Converting |==========| 100% | 25/25 | Total Progress
Converting |==========| 100% | 8/8   | Processing movies
Converting |==========| 100% | 7/7   | Processing series/season1
Converting |==========| 100% | 5/5   | Processing series/season2
Converting |==========| 100% | 3/3   | Processing series/specials
Converting |==========| 100% | 2/2   | Processing extras

📊 Batch Processing Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━
Total files processed: 25
Directories processed: 5
✅ Successfully converted: 23
❌ Failed: 1
⏭️  Skipped: 1
⏱️  Total time: 5.32s
⚡ Average time per file: 0.22s

📂 Directory Statistics:
━━━━━━━━━━━━━━━━━━━━
movies:
  Total: 8
  ✅ Success: 8
  ❌ Failed: 0
  ⏭️  Skipped: 0

series/season1:
  Total: 7
  ✅ Success: 6
  ❌ Failed: 1
  ⏭️  Skipped: 0

series/season2:
  Total: 5
  ✅ Success: 5
  ❌ Failed: 0
  ⏭️  Skipped: 0

series/specials:
  Total: 3
  ✅ Success: 2
  ❌ Failed: 0
  ⏭️  Skipped: 1

extras:
  Total: 2
  ✅ Success: 2
  ❌ Failed: 0
  ⏭️  Skipped: 0

❌ Errors:
━━━━━━━━━
series/season1/broken.srt: Failed to detect encoding
```

### Backup Management

SubZilla provides flexible backup options to protect your original files:

```bash
# Basic backup creation
subzilla convert input.srt -b

# By default, subsequent runs overwrite the existing backup
# First run: creates input.srt.bak
# Second run: overwrites input.srt.bak (clean, no accumulation)

# Create numbered backups instead (legacy behavior)
subzilla convert input.srt -b --no-overwrite-backup
# First run: creates input.srt.bak
# Second run: creates input.srt.bak.1
# Third run: creates input.srt.bak.2

# Configure backup behavior in config file
# .subzillarc:
# output:
#   createBackup: true
#   overwriteBackup: false  # Creates numbered backups
```

**Backup Behavior Summary:**

- **`overwriteBackup: true`** (default): Clean backup management - always overwrites existing backup
- **`overwriteBackup: false`**: Legacy behavior - creates numbered backups (`.bak.1`, `.bak.2`, etc.)
- **CLI override**: Use `--no-overwrite-backup` to temporarily disable backup overwriting

### Advanced Options

```bash
# Specify output file (single file conversion)
subzilla convert input.srt -o output.srt

# Get help
subzilla --help

# Get version
subzilla --version

# Get help for specific command
subzilla convert --help
subzilla batch --help
```

## Configuration 🔧

SubZilla supports flexible configuration through YAML files and environment variables. All settings are optional with sensible defaults.

### Configuration Files

SubZilla looks for configuration files in the following order:

1. Path specified via `--config` option
2. `.subzillarc` in the current directory
3. `.subzilla.yml` or `.subzilla.yaml`
4. `subzilla.config.yml` or `subzilla.config.yaml`

### Example Configurations

Several example configurations are provided in the `examples/config` directory:

1. **Full Configuration** (`.subzillarc`):

    ```yaml
    input:
        encoding: auto # auto, utf8, utf16le, utf16be, ascii, windows1256
        format: auto # auto, srt, sub, ass, ssa, txt

    output:
        directory: ./converted # Output directory path
        createBackup: true # Create backup of original files
        overwriteBackup: true # Overwrite existing backup files (default: true)
        format: srt # Output format
        encoding: utf8 # Always UTF-8
        bom: false # Add BOM to output files
        lineEndings: lf # lf, crlf, or auto

    # ... and more settings
    ```

2. **Minimal Configuration** (`minimal.subzillarc`):

    ```yaml
    input:
        encoding: auto
        format: auto

    output:
        directory: ./converted
        createBackup: true
        overwriteBackup: true # Overwrite existing backup files
        format: srt

    strip:
        html: true
        colors: true
        styles: true

    batch:
        recursive: true
        parallel: true
        skipExisting: true
        preserveStructure: true # Maintain directory structure
        chunkSize: 5
    ```

3. **Performance-Optimized** (`performance.subzillarc`):

    ```yaml
    output:
        createBackup: false # Skip backups
        overwriteBackup: true # When backups are created, overwrite existing ones
        overwriteInput: true # Overwrite input files
        overwriteExisting: true # Don't check existing files

    batch:
        parallel: true
        preserveStructure: false # Flat output structure
        chunkSize: 20 # Larger chunks
        retryCount: 0 # No retries
        failFast: true # Stop on first error
    ```

4. **Arabic-Optimized** (`arabic.subzillarc`):

    ```yaml
    input:
        encoding: windows1256 # Common Arabic encoding

    output:
        bom: true # Add BOM for compatibility
        lineEndings: crlf # Windows line endings

    batch:
        includeDirectories:
            - arabic
            - مسلسلات
            - أفلام
    ```

### Environment Variables

You can also configure SubZilla using environment variables. Copy `.env.example` to `.env` and modify as needed:

```bash
# Input Settings
SUBZILLA_INPUT_ENCODING=utf8
SUBZILLA_INPUT_FORMAT=srt
SUBZILLA_INPUT_DEFAULT_LANGUAGE=ar

# Output Settings
SUBZILLA_OUTPUT_DIRECTORY=./output
SUBZILLA_OUTPUT_CREATE_BACKUP=true

# Complex settings use JSON
SUBZILLA_STRIP='{"html":true,"colors":true,"styles":true}'
SUBZILLA_BATCH_INCLUDE_DIRECTORIES='["movies","series"]'
```

### Configuration Priority

Settings are merged in the following order (later ones override earlier ones):

1. Default values.
2. Configuration file.
3. Environment variables.
4. Command-line arguments.

### Available Options

#### Input Options

- `encoding`: Input file encoding (`auto`, `utf8`, `utf16le`, `utf16be`, `ascii`, `windows1256`).
- `format`: Input format (`auto`, `srt`, `sub`, `ass`, `ssa`, `txt`).

#### Output Options

- `directory`: Output directory path.
- `createBackup`: Create backup of original files.
- `overwriteBackup`: Overwrite existing backup files (default: `true`).
- `format`: Output format.
- `encoding`: Output encoding (always `utf8`).
- `bom`: Add BOM to output files.
- `lineEndings`: Line ending style (`lf`, `crlf`, `auto`).
- `overwriteInput`: Overwrite input files.
- `overwriteExisting`: Overwrite existing files.

#### Strip Options

- `html`: Remove HTML tags.
- `colors`: Remove color codes.
- `styles`: Remove style tags.
- `urls`: Replace URLs with `[URL]`.
- `timestamps`: Replace timestamps with `[TIMESTAMP]`.
- `numbers`: Replace numbers with `#`.
- `punctuation`: Remove punctuation.
- `emojis`: Replace emojis with `[EMOJI]`.
- `brackets`: Remove brackets.

#### Batch Options

- `recursive`: Process subdirectories.
- `parallel`: Process files in parallel.
- `skipExisting`: Skip existing UTF-8 files.
- `maxDepth`: Maximum directory depth.
- `includeDirectories`: Only process these directories.
- `excludeDirectories`: Skip these directories.
- `preserveStructure`: Maintain directory structure.
- `chunkSize`: Files per batch.
- `retryCount`: Number of retry attempts.
- `retryDelay`: Delay between retries (ms).
- `failFast`: Stop on first error.

## Architecture 🏗️

SubZilla follows a modular monorepo architecture with clear separation of concerns:

### Package Dependencies

```
@subzilla/cli
    ├── @subzilla/core
    │   └── @subzilla/types
    └── @subzilla/types
```

- **@subzilla/types**: Foundation package with no dependencies
- **@subzilla/core**: Depends on types, provides core functionality
- **@subzilla/cli**: Depends on both core and types, provides user interface

### Key Design Principles

- **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **YAGNI**: You Aren't Gonna Need It - avoid over-engineering
- **KISS**: Keep It Simple, Stupid - prioritize simplicity and clarity
- **DRY**: Don't Repeat Yourself - shared code in appropriate packages

### TypeScript Project References

The monorepo uses TypeScript project references for:

- Faster incremental builds
- Better IDE support
- Proper dependency tracking
- Type-safe cross-package imports

## Development 🛠️

### Project Structure

SubZilla is organized as a Yarn Workspaces monorepo with three main packages:

```
subzilla/
├── packages/
│   ├── cli/              # @subzilla/cli - Command-line interface
│   │   ├── src/
│   │   │   ├── commands/ # CLI command implementations
│   │   │   ├── constants/# Shared CLI options
│   │   │   ├── registry/ # Command registration system
│   │   │   ├── utils/    # CLI utilities
│   │   │   └── main.ts   # CLI entry point
│   │   └── package.json
│   ├── core/             # @subzilla/core - Core processing logic
│   │   ├── src/
│   │   │   ├── utils/    # Output strategies
│   │   │   ├── *.ts      # Core services and processors
│   │   │   └── index.ts  # Package exports
│   │   └── package.json
│   └── types/            # @subzilla/types - TypeScript definitions
│       ├── src/
│       │   ├── cli/      # CLI-related types
│       │   ├── core/     # Core functionality types
│       │   ├── index.ts  # Main exports
│       │   └── validation.ts # Zod schemas
│       └── package.json
├── examples/             # Configuration examples
├── package.json          # Workspace root configuration
└── tsconfig.json         # TypeScript project references
```

### Package Documentation

Each package has comprehensive documentation:

- **[@subzilla/cli](./packages/cli/README.md)** - Command-line interface with all available commands and options
- **[@subzilla/core](./packages/core/README.md)** - Core processing services and batch operations
- **[@subzilla/types](./packages/types/README.md)** - TypeScript interfaces and validation schemas

### Testing 🧪

SubZilla includes a comprehensive **Jest testing framework** with **83 passing tests** across all packages:

```bash
# Run all tests
yarn test

# Test specific package
yarn workspace @subzilla/core test
yarn workspace @subzilla/cli test
yarn workspace @subzilla/types test
```

**Test Coverage:**

- **@subzilla/types** (13 tests): Zod schema validation, configuration validation
- **@subzilla/core** (57 tests): Encoding detection/conversion, formatting stripping, end-to-end processing
- **@subzilla/cli** (13 tests): Command registration, CLI parsing, error handling

**Key Features:**

- **Multi-project Jest setup** with TypeScript support
- **Real file system testing** with temporary directories
- **CLI integration tests** using `execSync`
- **Proper TypeScript mocking** with generic type annotations
- **Arabic text encoding tests** for Windows-1256 support
- **CI/CD integration** with GitHub Actions

### Available Scripts

**Workspace-level scripts:**

- `yarn build`: Build all packages in dependency order
- `yarn start`: Run the SubZilla CLI
- `yarn dev`: Development mode with watch for all packages
- `yarn test`: Run tests across all packages
- `yarn type-check`: TypeScript type checking for all packages
- `yarn lint`: Run linter across all packages
- `yarn lint:fix`: Fix linting issues across all packages
- `yarn format`: Format code using Prettier across all packages
- `yarn format:check`: Check code formatting across all packages
- `yarn clean`: Clean all build artifacts

**Package-specific scripts:**

```bash
# Build specific package
yarn workspace @subzilla/core build

# Run CLI directly
yarn workspace @subzilla/cli start

# Develop specific package
yarn workspace @subzilla/types dev
```

### Monorepo Benefits

The workspace structure provides several advantages:

- **Shared Dependencies**: Common dependencies are hoisted to the root, reducing duplication
- **Type Safety**: Cross-package imports are fully type-checked at compile time
- **Atomic Changes**: Related changes across packages can be made in a single commit
- **Consistent Tooling**: Shared linting, formatting, and build configurations
- **Simplified Development**: Single `yarn install` and `yarn build` for the entire project

### Contributing

1. **Fork the repository**
2. **Clone your fork and install dependencies**

    ```bash
    git clone https://github.com/your-username/subzilla.git
    cd subzilla
    yarn install
    ```

3. **Create your feature branch**

    ```bash
    git checkout -b feature/amazing-feature
    ```

4. **Make your changes**
    - Follow the existing code style and patterns
    - Add tests for new functionality
    - Update documentation as needed
    - Ensure all packages build successfully: `yarn build`

5. **Test your changes**

    ```bash
    yarn build
    yarn test
    yarn lint
    yarn type-check
    ```

6. **Commit your changes**

    ```bash
    git commit -m 'Add some amazing feature'
    ```

7. **Push to your branch**

    ```bash
    git push origin feature/amazing-feature
    ```

8. **Open a Pull Request**

### Development Workflow

```bash
# Start development mode (watches all packages)
yarn dev

# Build specific package
yarn workspace @subzilla/core build

# Test specific package
yarn workspace @subzilla/cli test

# Run CLI during development
yarn start --help

# Clean and rebuild everything
yarn clean
yarn build
```

## License 📝

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Support 💪

If you encounter any issues or have questions, please:

1. Check the [issues page](https://github.com/onyxdevs/subzilla/issues)
2. Create a new issue if your problem isn't already listed
3. Provide as much detail as possible, including:
    - SubZilla version
    - Node.js version
    - Operating system
    - Sample subtitle file (if possible)

## Acknowledgments 🙏

- Thanks to all contributors.
- Inspired by the need for better subtitle encoding support.
- Built with TypeScript and Node.js.

## Further Enhancements 🚀

Planned improvements and feature additions:

1. **Enhanced Format Support**
    - [ ] Add support for `.ass` and `.ssa` subtitle formats
    - [x] Handle multiple subtitle files in batch
    - [ ] Support subtitle format conversion (SRT ↔ ASS ↔ SSA)
    - [ ] Add WebVTT format support
    - [ ] Support subtitle timing synchronization

2. **User Interface & Experience**
    - [x] Interactive CLI mode with comprehensive commands
    - [x] Progress bars for batch operations
    - [ ] Create a web interface for browser-based conversion
    - [ ] Build a native macOS app using Electron
    - [ ] Add drag-and-drop GUI interface
    - [ ] Implement real-time encoding preview

3. **Performance & Reliability**
    - [x] Parallel processing for batch operations
    - [x] Configurable chunk size for parallel processing
    - [x] Retry mechanism for failed conversions
    - [x] Batch processing progress tracking and statistics
    - [ ] Memory usage optimization for large files
    - [ ] Streaming processing for very large subtitle files
    - [ ] Performance benchmarking and profiling tools
    - [ ] Caching mechanism for repeated operations

4. **Advanced Features**
    - [x] Comprehensive subtitle validation with Zod schemas
    - [x] Extensive formatting stripping (HTML, colors, styles, emojis)
    - [ ] Subtitle timing adjustment and synchronization
    - [ ] Subtitle merging and splitting
    - [ ] Character encoding preview and detection confidence
    - [ ] JSON/CSV export for batch processing results
    - [ ] AI-powered subtitle translation integration
    - [ ] Subtitle quality analysis and scoring

5. **Developer Experience & Infrastructure**
    - [x] Comprehensive test suite (83 tests across all packages)
    - [x] TypeScript monorepo with project references
    - [x] Detailed API documentation for all packages
    - [x] Configuration examples and templates
    - [ ] GitHub Actions CI/CD workflow
    - [ ] Automated release management
    - [ ] Performance regression testing
    - [ ] Docker containerization
    - [ ] Plugin system for custom processors
    - [ ] Webhook integration for automated workflows

6. **Integration & Ecosystem**
    - [ ] VS Code extension for subtitle editing
    - [ ] API server mode for remote processing
    - [ ] Integration with popular media players
    - [ ] Cloud storage integration (S3, Google Drive, Dropbox)
    - [ ] Batch processing via file watching
    - [ ] Integration with subtitle databases (OpenSubtitles, etc.)

Want to contribute to these enhancements? Check our [Contributing](#contributing) section!
