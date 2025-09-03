# @subzilla/core 🔧

Core subtitle processing functionality for the SubZilla subtitle converter. This package contains the main business logic for encoding detection, conversion, batch processing, and configuration management.

## Overview

The core package provides the essential services and processors that power SubZilla's subtitle conversion capabilities. It handles everything from single file conversions to complex batch operations with parallel processing, progress tracking, and comprehensive error handling.

## Features ✨

- **Automatic Encoding Detection**: Intelligent detection of subtitle file encodings
- **UTF-8 Conversion**: Robust conversion to UTF-8 with proper handling of various encodings
- **Batch Processing**: High-performance parallel processing of multiple files
- **Configuration Management**: Flexible YAML-based configuration with environment variable support
- **Formatting Control**: Advanced HTML/style stripping and text normalization
- **Progress Tracking**: Real-time progress bars and detailed statistics
- **Error Handling**: Comprehensive error tracking and recovery mechanisms
- **Output Strategies**: Flexible file naming and backup strategies

## Installation

```bash
# Install as part of SubZilla workspace
yarn install

# Or install individually (if published)
yarn add @subzilla/core
```

## Package Structure

```
src/
├── BatchProcessor.ts              # Batch processing with progress tracking
├── ConfigManager.ts               # Configuration loading and validation
├── EncodingConversionService.ts   # Character encoding conversion
├── EncodingDetectionService.ts    # Automatic encoding detection
├── FormattingStripper.ts          # HTML/style tag removal
├── SubtitleProcessor.ts           # Main subtitle processing logic
├── index.ts                       # Package exports
└── utils/                         # Utility classes
    ├── OverwriteOutputStrategy.ts # Overwrite existing files strategy
    └── SuffixOutputStrategy.ts    # Add suffix to output files strategy
```

## Core Services

### SubtitleProcessor

The main processor for individual subtitle file conversions.

```typescript
import { SubtitleProcessor } from '@subzilla/core';
import { IConvertOptions } from '@subzilla/types';

const processor = new SubtitleProcessor();

const options: IConvertOptions = {
    inputFile: 'subtitle.srt',
    outputFile: 'subtitle.utf8.srt',
    encoding: 'auto',
    createBackup: true,
    stripOptions: {
        html: true,
        colors: true,
        styles: false,
    },
};

await processor.processFile(options);
```

**Key Features:**

- Automatic encoding detection and conversion
- Configurable output strategies (suffix, overwrite)
- HTML/style tag stripping
- Backup file creation
- Comprehensive error handling

### BatchProcessor

High-performance batch processing with parallel execution and progress tracking.

```typescript
import { BatchProcessor } from '@subzilla/core';
import { IBatchOptions } from '@subzilla/types';

const batchProcessor = new BatchProcessor();

const options: IBatchOptions = {
    pattern: '**/*.srt',
    outputDir: './converted',
    recursive: true,
    parallel: true,
    skipExisting: true,
    maxDepth: 5,
    preserveStructure: true,
    chunkSize: 10,
};

const stats = await batchProcessor.processBatch('**/*.srt', options);
console.log(`Processed ${stats.successfulFiles} files successfully`);
```

**Key Features:**

- Glob pattern file discovery
- Parallel processing with configurable chunk sizes
- Real-time progress bars (total + per-directory)
- Directory structure preservation
- Comprehensive statistics and error reporting
- Skip existing files optimization
- Retry mechanisms for failed conversions

### ConfigManager

Flexible configuration management with multiple sources and validation.

```typescript
import { ConfigManager } from '@subzilla/core';

// Load from default locations
const config = await ConfigManager.loadConfig();

// Load from specific file
const config = await ConfigManager.loadConfig('./my-config.yml');

// Save configuration
await ConfigManager.saveConfig(config, './.subzillarc');

// Create default configuration
await ConfigManager.createDefaultConfig('./default-config.yml');
```

**Configuration Sources (in order of precedence):**

1. Command-line arguments
2. Environment variables (SUBZILLA\_\*)
3. Configuration files (.subzillarc, .subzilla.yml, etc.)
4. Default values

**Supported Formats:**

- YAML (.yml, .yaml)
- JSON (.json)
- Environment variables with JSON values

### EncodingDetectionService

Intelligent encoding detection for subtitle files.

```typescript
import { EncodingDetectionService } from '@subzilla/core';

// Detect encoding from file
const encoding = await EncodingDetectionService.detectEncoding('subtitle.srt');
console.log(`Detected encoding: ${encoding}`); // e.g., "windows-1256"

// Detect from buffer
const buffer = await fs.readFile('subtitle.srt');
const encoding = EncodingDetectionService.detectEncodingFromBuffer(buffer);
```

**Supported Encodings:**

- UTF-8, UTF-16LE, UTF-16BE
- Windows-1256 (Arabic)
- ASCII
- ISO-8859-1 (Latin-1)
- And more via chardet library

### EncodingConversionService

Robust character encoding conversion with error handling.

```typescript
import { EncodingConversionService } from '@subzilla/core';

// Convert encoding
const utf8Content = await EncodingConversionService.convertToUtf8('subtitle.srt', 'windows-1256');

// Convert with custom options
const converted = await EncodingConversionService.convertEncoding(buffer, 'windows-1256', 'utf8');
```

### FormattingStripper

Advanced text processing for subtitle cleanup.

```typescript
import { FormattingStripper } from '@subzilla/core';
import { IStripOptions } from '@subzilla/types';

const stripper = new FormattingStripper();

const options: IStripOptions = {
    html: true, // Remove <b>, <i>, <u> tags
    colors: true, // Remove color codes
    styles: true, // Remove style attributes
    urls: true, // Replace URLs with [URL]
    timestamps: false, // Keep timestamps
    emojis: true, // Replace emojis with [EMOJI]
    brackets: false, // Keep brackets
};

const cleanContent = stripper.stripFormatting(content, options);
```

**Stripping Capabilities:**

- HTML tags (`<b>`, `<i>`, `<u>`, `<font>`, etc.)
- Color codes (`{c:$FFFFFF}`, `<font color="#FF0000">`)
- Style attributes and CSS
- URLs (replaced with `[URL]`)
- Timestamps (replaced with `[TIMESTAMP]`)
- Emojis (replaced with `[EMOJI]`)
- Brackets and parentheses
- Excessive whitespace normalization

## Output Strategies

### SuffixOutputStrategy (Default)

Adds a suffix to output files to avoid overwriting originals.

```typescript
import { SuffixOutputStrategy } from '@subzilla/core/utils';

const strategy = new SuffixOutputStrategy();
const outputPath = strategy.generateOutputPath('movie.srt', options);
// Result: "movie.utf8.srt"
```

### OverwriteOutputStrategy

Overwrites input files directly (use with caution).

```typescript
import { OverwriteOutputStrategy } from '@subzilla/core/utils';

const strategy = new OverwriteOutputStrategy();
const outputPath = strategy.generateOutputPath('movie.srt', options);
// Result: "movie.srt" (same as input)
```

## Usage Examples

### Single File Conversion

```typescript
import { SubtitleProcessor, ConfigManager } from '@subzilla/core';

async function convertSingleFile() {
    const config = await ConfigManager.loadConfig();
    const processor = new SubtitleProcessor();

    await processor.processFile({
        inputFile: 'arabic-subtitle.srt',
        outputFile: 'arabic-subtitle.utf8.srt',
        encoding: 'windows-1256',
        createBackup: true,
        stripOptions: config.strip,
    });

    console.log('✅ Conversion completed!');
}
```

### Batch Processing with Progress

```typescript
import { BatchProcessor } from '@subzilla/core';

async function batchConvert() {
    const processor = new BatchProcessor();

    const stats = await processor.processBatch('**/*.{srt,sub}', {
        outputDir: './converted',
        recursive: true,
        parallel: true,
        skipExisting: true,
        maxDepth: 3,
        preserveStructure: true,
        chunkSize: 15,
        retryCount: 2,
        retryDelay: 1000,
    });

    console.log(`
📊 Batch Processing Complete:
   Total: ${stats.totalFiles}
   ✅ Success: ${stats.successfulFiles}
   ❌ Failed: ${stats.failedFiles}
   ⏭️ Skipped: ${stats.skippedFiles}
   ⏱️ Time: ${stats.timeTaken.toFixed(2)}s
    `);
}
```

### Custom Configuration

```typescript
import { ConfigManager } from '@subzilla/core';

async function setupCustomConfig() {
    const config = await ConfigManager.loadConfig();

    // Modify configuration
    config.output.createBackup = true;
    config.output.overwriteBackup = false; // Create numbered backups
    config.strip.html = true;
    config.strip.colors = true;
    config.batch.parallel = true;
    config.batch.chunkSize = 20;

    // Save custom configuration
    await ConfigManager.saveConfig(config, './custom-config.yml');

    console.log('✅ Custom configuration saved!');
}
```

### Error Handling

```typescript
import { SubtitleProcessor } from '@subzilla/core';

async function robustConversion() {
    const processor = new SubtitleProcessor();

    try {
        await processor.processFile({
            inputFile: 'problematic-subtitle.srt',
            encoding: 'auto', // Let the system detect
        });
    } catch (error) {
        if (error.code === 'ENCODING_DETECTION_FAILED') {
            console.log('🔄 Trying with fallback encoding...');

            await processor.processFile({
                inputFile: 'problematic-subtitle.srt',
                encoding: 'windows-1256', // Fallback
            });
        } else {
            console.error('❌ Conversion failed:', error.message);
        }
    }
}
```

## Performance Considerations

### Batch Processing Optimization

```typescript
// Optimal settings for large batch operations
const highPerformanceOptions = {
    parallel: true,
    chunkSize: 20, // Process 20 files simultaneously
    skipExisting: true, // Skip already converted files
    retryCount: 1, // Minimal retries for speed
    failFast: false, // Continue on errors
};

// Memory-efficient settings for limited resources
const memoryEfficientOptions = {
    parallel: false, // Sequential processing
    chunkSize: 1, // One file at a time
    skipExisting: true,
    retryCount: 3, // More retries for reliability
};
```

### Configuration Caching

```typescript
// Cache configuration for multiple operations
const config = await ConfigManager.loadConfig();

// Reuse for multiple processors
const processor1 = new SubtitleProcessor();
const processor2 = new SubtitleProcessor();
// Both can use the same config object
```

## Error Codes

The core package defines specific error codes for different failure scenarios:

- `ENCODING_DETECTION_FAILED`: Could not detect file encoding
- `CONVERSION_FAILED`: Encoding conversion failed
- `FILE_NOT_FOUND`: Input file does not exist
- `PERMISSION_DENIED`: Insufficient permissions
- `INVALID_FORMAT`: Unsupported subtitle format
- `CONFIG_VALIDATION_FAILED`: Configuration validation error

## Dependencies

- **chardet**: Character encoding detection
- **iconv-lite**: Character encoding conversion
- **cli-progress**: Progress bar functionality
- **glob**: File pattern matching
- **yaml**: YAML configuration parsing
- **zod**: Runtime validation (via @subzilla/types)

## Related Packages

- **[@subzilla/types](../types/README.md)**: TypeScript type definitions
- **[@subzilla/cli](../cli/README.md)**: Command-line interface

## License

ISC License - see the root [LICENSE](../../LICENSE) file for details.
