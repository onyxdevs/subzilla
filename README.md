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

# Install dependencies
yarn install

# Build the project
yarn build

# Link for local development
yarn link
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

## Development 🛠️

### Project Structure

```
subzilla/
├── src/
│   ├── cli/          # Command-line interface
│   ├── core/         # Core conversion logic
│   ├── utils/        # Utility functions
│   └── types/        # TypeScript type definitions
├── test/             # Test files
├── dist/             # Compiled output
└── package.json      # Project configuration
```

### Available Scripts

- `yarn build`: Build the project.
- `yarn start`: Run the CLI.
- `yarn dev`: Run in development mode.
- `yarn test`: Run tests.
- `yarn lint`: Run linter.
- `yarn lint:fix`: Fix linting issues.
- `yarn format`: Format code using Prettier.
- `yarn format:check`: Check code formatting.

### Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

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

    - [ ] Add support for `.ass` and `.ssa` subtitle formats.
    - [x] Handle multiple subtitle files in batch.
    - [ ] Support subtitle format conversion.

2. **User Interface**

    - [x] Add interactive CLI mode.
    - [x] Implement progress bars for large files.
    - [ ] Create a web interface.

3. **Performance Optimization**

    - [x] Implement parallel processing for batch operations.
    - [ ] Optimize memory usage.
    - [x] Add batch processing progress tracking.
    - [x] Add batch processing statistics and reporting.
    - [ ] Add configurable chunk size for parallel processing.
    - [ ] Implement retry mechanism for failed conversions.

4. **Additional Features**

    - [x] Add subtitle validation.
    - [ ] Implement timing adjustment.
    - [ ] Support subtitle merging.
    - [ ] Add character encoding preview.
    - [x] Add batch processing statistics and reporting.
    - [ ] Add JSON output format for statistics.
    - [ ] Add CSV export for batch results.
    - [ ] AI translation of subtitles.

5. **Developer Experience**

    - [ ] Add comprehensive tests.
    - [ ] Improve error messages.
    - [ ] Create detailed API documentation.
    - [ ] Add GitHub Actions workflow.
    - [x] Add batch processing examples and test cases.
    - [ ] Add performance benchmarking tools.
    - [x] Create batch processing configuration files.

Want to contribute to these enhancements? Check our [Contributing](#contributing) section!
