# @subzilla/cli 🖥️

Command-line interface for the SubZilla subtitle converter. This package provides an intuitive and powerful CLI for converting subtitle files with comprehensive options and real-time feedback.

## Overview

The CLI package serves as the primary user interface for SubZilla, offering a complete command-line experience with multiple commands, extensive options, and excellent user experience features like progress bars, colored output, and detailed help information.

## Features ✨

- **Multiple Commands**: Convert, batch process, initialize config, and inspect files
- **Rich Options**: Comprehensive formatting, backup, and processing options
- **Progress Tracking**: Real-time progress bars for batch operations
- **Configuration Support**: Flexible configuration file management
- **Error Handling**: Detailed error messages and graceful failure handling
- **Help System**: Built-in help for all commands and options
- **Colored Output**: Beautiful, emoji-rich console output

## Installation

```bash
# Install as part of SubZilla workspace
yarn install

# Or install globally (if published)
yarn global add @subzilla/cli
```

## Package Structure

```
src/
├── commands/                    # Command implementations
│   ├── base-command.ts         # Base command creator class
│   ├── batch-command.ts        # Batch processing command
│   ├── convert-command.ts      # Single file conversion command
│   ├── info-command.ts         # File information command
│   └── init-command.ts         # Configuration initialization command
├── constants/
│   └── options.ts              # Shared CLI option definitions
├── registry/
│   └── command-registry.ts     # Command registration system
├── utils/
│   └── strip-options.ts        # Option processing utilities
└── main.ts                     # CLI entry point
```

## Available Commands

### convert - Single File Conversion

Convert a single subtitle file to UTF-8 with optional formatting cleanup.

```bash
# Basic conversion
subzilla convert input.srt

# Convert with output file specification
subzilla convert input.srt -o output.srt

# Create backup and strip HTML
subzilla convert input.srt --backup --strip-html

# Strip all formatting
subzilla convert input.srt --strip-all

# Advanced options
subzilla convert input.srt \
  --backup \
  --no-overwrite-backup \
  --strip-html \
  --strip-colors \
  --bom \
  --line-endings crlf
```

**Options:**

- `-o, --output <path>`: Specify output file path
- `-b, --backup`: Create backup of original file
- `--no-overwrite-backup`: Create numbered backups instead of overwriting
- `--bom`: Add UTF-8 BOM to output file
- `--line-endings <type>`: Line endings (lf, crlf, auto)
- `--overwrite-existing`: Overwrite existing output file
- `--strip-html`: Remove HTML tags
- `--strip-colors`: Remove color codes
- `--strip-styles`: Remove style tags
- `--strip-urls`: Replace URLs with [URL]
- `--strip-timestamps`: ⚠️ **DISABLED** - Would corrupt subtitle files
- `--strip-numbers`: ⚠️ **DISABLED** - Would corrupt subtitle files
- `--strip-punctuation`: Remove punctuation
- `--strip-emojis`: Replace emojis with [EMOJI]
- `--strip-brackets`: Remove brackets
- `--strip-bidi-control`: Remove bidirectional control characters
- `--strip-all`: Apply all safe stripping options

> **⚠️ Warning:** The `--strip-timestamps` and `--strip-numbers` options are automatically disabled for subtitle files as they would corrupt the file structure. These options are for text analysis only, not for producing playable subtitles.

### batch - Batch Processing

Process multiple subtitle files using glob patterns with advanced filtering and parallel processing.

```bash
# Basic batch processing
subzilla batch "*.srt"

# Recursive processing with output directory
subzilla batch "**/*.srt" -r -o converted/

# Parallel processing with progress tracking
subzilla batch "**/*.{srt,sub}" -r -p -s

# Advanced directory filtering
subzilla batch "**/*.srt" \
  --recursive \
  --parallel \
  --skip-existing \
  --max-depth 3 \
  --include-dirs movies series \
  --exclude-dirs temp backup \
  --preserve-structure \
  --output-dir converted/

# Batch with formatting options
subzilla batch "**/*.srt" -r -p --strip-all --backup
```

**Options:**

- `-o, --output-dir <dir>`: Output directory for converted files
- `-r, --recursive`: Process files in subdirectories
- `-p, --parallel`: Enable parallel processing
- `-s, --skip-existing`: Skip files that already have UTF-8 versions
- `-d, --max-depth <depth>`: Maximum directory depth for recursive search
- `-i, --include-dirs <dirs...>`: Only process files in specified directories
- `-x, --exclude-dirs <dirs...>`: Exclude files in specified directories
- `--preserve-structure`: Maintain directory structure in output
- All convert command options are also available

**Features:**

- Real-time progress bars (total + per-directory)
- Detailed statistics and error reporting
- Directory structure preservation
- Intelligent file discovery with glob patterns
- Parallel processing with configurable chunk sizes
- Skip existing files optimization

### info - File Information

Display detailed information about subtitle files including encoding, format, and statistics.

```bash
# Basic file information
subzilla info subtitle.srt

# Example output:
# 📄 SRT File Information
#
# 📝 Basic Information
#    • File: subtitle.srt
#    • Size: 45.32 KB
#    • Modified: 12/3/2023, 2:30:15 PM
#
# 🔤 Encoding Information
#    • Detected Encoding: windows-1256
#    • BOM: No
#    • Line Endings: CRLF
#
# 📊 Content Statistics
#    • Total Lines: 1,234
#    • Subtitle Entries: 567
```

**Information Provided:**

- File size and modification date
- Detected character encoding
- BOM (Byte Order Mark) presence
- Line ending format (LF/CRLF)
- Content statistics (lines, entries)

### init - Configuration Initialization

Create default configuration files with comprehensive settings.

```bash
# Create default config in current directory
subzilla init

# Create config at specific path
subzilla init ./config/.subzillarc

# Create config with custom name
subzilla init my-config.yml
```

**Generated Configuration:**

- Complete YAML configuration with all available options
- Detailed comments explaining each setting
- Sensible defaults for immediate use
- Examples for common use cases

## Global Options

Available for all commands:

- `-c, --config <path>`: Specify custom configuration file path
- `-h, --help`: Display help information
- `-V, --version`: Show version number

## Command Architecture

### Base Command System

All commands extend the `BaseCommandCreator` class for consistent behavior:

```typescript
import { BaseCommandCreator } from '@subzilla/cli';
import { ICommandDefinition } from '@subzilla/types';

export class MyCommandCreator extends BaseCommandCreator {
    protected getDefinition(): ICommandDefinition {
        return {
            name: 'my-command',
            description: 'My custom command',
            arguments: [
                {
                    name: 'input',
                    description: 'Input file path',
                },
            ],
            options: [
                {
                    flags: '-o, --output <path>',
                    description: 'Output file path',
                },
            ],
            action: async (input: string, options: any) => {
                // Command implementation
            },
        };
    }
}
```

### Command Registry

Commands are registered through a centralized registry system:

```typescript
import { DefaultCommandRegistry } from '@subzilla/cli';
import { ConvertCommandCreator, BatchCommandCreator } from '@subzilla/cli';

const registry = new DefaultCommandRegistry(program);
registry.registerCommands([
    new ConvertCommandCreator(),
    new BatchCommandCreator(),
    // Add custom commands
]);
```

## Usage Examples

### Basic File Conversion

```bash
# Convert Arabic subtitle with backup
subzilla convert arabic-movie.srt --backup --strip-html

# Convert with specific output name
subzilla convert input.srt -o clean-output.srt --strip-all
```

### Batch Processing Workflows

```bash
# Process all subtitles in a movie collection
subzilla batch "Movies/**/*.srt" \
  --recursive \
  --parallel \
  --skip-existing \
  --output-dir "Movies-UTF8/" \
  --preserve-structure \
  --strip-all \
  --backup

# Clean up TV series subtitles
subzilla batch "Series/**/*.{srt,sub}" \
  --recursive \
  --parallel \
  --max-depth 2 \
  --include-dirs "Season*" \
  --exclude-dirs "Extras" "Behind*" \
  --strip-html \
  --strip-colors
```

### Configuration Management

```bash
# Create custom configuration
subzilla init .subzillarc

# Use custom configuration
subzilla convert input.srt --config ./custom-config.yml

# Process with environment-specific config
SUBZILLA_OUTPUT_DIRECTORY=./output subzilla batch "*.srt"
```

### File Analysis

```bash
# Check encoding before conversion
subzilla info problematic-subtitle.srt

# Batch analysis (using shell commands)
for file in *.srt; do
    echo "=== $file ==="
    subzilla info "$file"
done
```

## Error Handling

The CLI provides comprehensive error handling with helpful messages:

```bash
# File not found
$ subzilla convert missing.srt
❌ Error: File not found: missing.srt

# Invalid configuration
$ subzilla convert input.srt --config invalid.yml
❌ Config validation failed:
  - output.chunkSize: Expected number, received string
  - batch.maxDepth: Number must be greater than 0

# Encoding detection failure
$ subzilla convert corrupted.srt
❌ Failed to detect encoding for: corrupted.srt
💡 Try specifying encoding manually with --encoding option
```

## Progress Tracking

Batch operations show detailed progress information:

```
🔍 Found 25 files in 5 directories...

Converting |████████████████████| 100% | 25/25 | Total Progress
Converting |████████████████████| 100% | 8/8   | Processing movies
Converting |████████████████████| 100% | 7/7   | Processing series/season1
Converting |████████████████████| 100% | 5/5   | Processing series/season2
Converting |████████████████████| 100% | 3/3   | Processing series/specials
Converting |████████████████████| 100% | 2/2   | Processing extras

📊 Batch Processing Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━
Total files processed: 25
Directories processed: 5
✅ Successfully converted: 23
❌ Failed: 1
⏭️  Skipped: 1
⏱️  Total time: 5.32s
⚡ Average time per file: 0.22s
```

## Configuration Integration

The CLI seamlessly integrates with SubZilla's configuration system:

### Configuration File Priority

1. Command-line arguments (highest priority)
2. Environment variables (SUBZILLA\_\*)
3. Configuration file specified via --config
4. Default configuration files (.subzillarc, etc.)
5. Built-in defaults (lowest priority)

### Environment Variables

```bash
# Set default output directory
export SUBZILLA_OUTPUT_DIRECTORY=./converted

# Enable parallel processing by default
export SUBZILLA_BATCH_PARALLEL=true

# Configure stripping options
export SUBZILLA_STRIP='{"html":true,"colors":true,"styles":true}'
```

## Performance Tips

### Optimal Batch Processing

```bash
# For large collections (1000+ files)
subzilla batch "**/*.srt" \
  --recursive \
  --parallel \
  --skip-existing \
  --max-depth 5

# For limited memory systems
subzilla batch "**/*.srt" \
  --recursive \
  --skip-existing \
  # (parallel disabled for sequential processing)

# For maximum speed (SSD storage)
subzilla batch "**/*.srt" \
  --recursive \
  --parallel \
  --skip-existing \
  --no-backup  # Skip backup creation
```

### Configuration Optimization

```yaml
# High-performance configuration
batch:
    parallel: true
    chunkSize: 20
    skipExisting: true
    retryCount: 1
    failFast: false

output:
    createBackup: false # Skip backups for speed
    overwriteExisting: true
```

## Dependencies

- **commander**: Command-line argument parsing and help generation
- **module-alias**: Module path resolution for workspace packages
- **@subzilla/core**: Core processing functionality
- **@subzilla/types**: TypeScript type definitions

## Related Packages

- **[@subzilla/core](../core/README.md)**: Core subtitle processing functionality
- **[@subzilla/types](../types/README.md)**: TypeScript type definitions

## License

ISC License - see the root [LICENSE](../../LICENSE) file for details.
