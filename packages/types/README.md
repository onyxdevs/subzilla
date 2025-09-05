# @subzilla/types 📝

TypeScript type definitions and validation schemas for the SubZilla subtitle converter ecosystem.

## Overview

This package provides comprehensive TypeScript interfaces, types, and Zod validation schemas used across all SubZilla packages. It serves as the foundation for type safety and runtime validation throughout the application.

## Features ✨

- **Complete Type Definitions**: Interfaces for all CLI commands, core operations, and configuration
- **Runtime Validation**: Zod schemas for configuration validation and type safety
- **Modular Structure**: Organized by domain (CLI, Core, Validation)
- **Zero Dependencies**: Only depends on Zod for validation
- **Strict TypeScript**: Full type coverage with strict compiler settings

## Installation

```bash
# Install as part of SubZilla workspace
yarn install

# Or install individually (if published)
yarn add @subzilla/types
```

## Package Structure

```
src/
├── cli/                    # CLI-related types
│   ├── command.ts         # Command interfaces and creators
│   └── options.ts         # CLI option interfaces
├── core/                  # Core functionality types
│   ├── batch.ts          # Batch processing interfaces
│   ├── config.ts         # Configuration interfaces
│   ├── options.ts        # Processing option interfaces
│   └── utils.ts          # Utility interfaces
├── index.ts              # Main exports
└── validation.ts         # Zod validation schemas
```

## Type Categories

### CLI Types

#### Command Interfaces

```typescript
interface ICommandDefinition<T = any> {
    name: string;
    description: string;
    arguments?: ICommandArgument[];
    options?: ICommandOption[];
    action: (...args: any[]) => Promise<void>;
}

interface ICommandCreator<T = any> {
    create(): ICommandDefinition<T>;
}
```

#### Command Options

```typescript
interface IConvertCommandOptions {
    output?: string;
    backup?: boolean;
    noOverwriteBackup?: boolean;
    stripHtml?: boolean;
    stripColors?: boolean;
    stripStyles?: boolean;
    stripUrls?: boolean;
    stripAll?: boolean;
}

interface IBatchCommandOptions extends IConvertCommandOptions {
    outputDir?: string;
    recursive?: boolean;
    parallel?: boolean;
    skipExisting?: boolean;
    maxDepth?: number;
    includeDirs?: string[];
    excludeDirs?: string[];
    preserveStructure?: boolean;
}
```

### Core Types

#### Configuration Interfaces

```typescript
interface IConfig {
    input: IInputConfig;
    output: IOutputConfig;
    strip: IStripConfig;
    batch: IBatchConfig;
}

interface IInputConfig {
    encoding: TEncoding;
    format: TFormat;
}

interface IOutputConfig {
    directory: string;
    createBackup: boolean;
    overwriteBackup: boolean;
    format: TFormat;
    encoding: 'utf8';
    bom: boolean;
    lineEndings: TLineEndings;
    overwriteInput: boolean;
    overwriteExisting: boolean;
}
```

#### Processing Options

```typescript
interface IConvertOptions {
    inputFile: string;
    outputFile?: string;
    encoding?: TEncoding;
    createBackup?: boolean;
    overwriteBackup?: boolean;
    stripOptions?: IStripOptions;
}

interface IBatchOptions {
    pattern: string;
    outputDir?: string;
    recursive?: boolean;
    parallel?: boolean;
    skipExisting?: boolean;
    maxDepth?: number;
    includeDirectories?: string[];
    excludeDirectories?: string[];
    preserveStructure?: boolean;
    chunkSize?: number;
    retryCount?: number;
    retryDelay?: number;
    failFast?: boolean;
}
```

#### Batch Processing Types

```typescript
interface IBatchStats {
    totalFiles: number;
    processedFiles: number;
    successfulFiles: number;
    failedFiles: number;
    skippedFiles: number;
    totalTime: number;
    averageTimePerFile: number;
    directories: Map<string, IBatchDirectoryStats>;
    errors: IBatchError[];
}

interface IBatchDirectoryStats {
    path: string;
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    skippedFiles: number;
    processingTime: number;
}
```

### Utility Types

#### Output Strategies

```typescript
interface IOutputStrategy {
    generateOutputPath(inputPath: string, options: IConvertOptions): string;
    shouldOverwrite(outputPath: string, options: IConvertOptions): boolean;
}
```

#### Type Unions

```typescript
type TEncoding = 'auto' | 'utf8' | 'utf16le' | 'utf16be' | 'ascii' | 'windows1256';
type TFormat = 'auto' | 'srt' | 'sub' | 'ass' | 'ssa' | 'txt';
type TLineEndings = 'lf' | 'crlf' | 'auto';
type TConfigSegment = 'input' | 'output' | 'strip' | 'batch';
```

## Validation Schemas

The package includes comprehensive Zod schemas for runtime validation:

### Configuration Schema

```typescript
export const configSchema = z.object({
    input: z.object({
        encoding: z.enum(['auto', 'utf8', 'utf16le', 'utf16be', 'ascii', 'windows1256']),
        format: z.enum(['auto', 'srt', 'sub', 'ass', 'ssa', 'txt']),
    }),
    output: z.object({
        directory: z.string(),
        createBackup: z.boolean(),
        overwriteBackup: z.boolean(),
        format: z.enum(['srt', 'sub', 'ass', 'ssa', 'txt']),
        encoding: z.literal('utf8'),
        bom: z.boolean(),
        lineEndings: z.enum(['lf', 'crlf', 'auto']),
        overwriteInput: z.boolean(),
        overwriteExisting: z.boolean(),
    }),
    strip: z.object({
        html: z.boolean(),
        colors: z.boolean(),
        styles: z.boolean(),
        urls: z.boolean(),
        timestamps: z.boolean(),
        numbers: z.boolean(),
        punctuation: z.boolean(),
        emojis: z.boolean(),
        brackets: z.boolean(),
    }),
    batch: z.object({
        recursive: z.boolean(),
        parallel: z.boolean(),
        skipExisting: z.boolean(),
        maxDepth: z.number().min(1).max(20),
        includeDirectories: z.array(z.string()),
        excludeDirectories: z.array(z.string()),
        preserveStructure: z.boolean(),
        chunkSize: z.number().min(1).max(100),
        retryCount: z.number().min(0).max(10),
        retryDelay: z.number().min(0),
        failFast: z.boolean(),
    }),
});
```

## Usage Examples

### Importing Types

```typescript
import { IConfig, IConvertOptions, IBatchOptions, ICommandDefinition, TEncoding, configSchema } from '@subzilla/types';
```

### Using Validation

```typescript
import { configSchema } from '@subzilla/types';

function validateConfig(config: unknown): IConfig {
    try {
        return configSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Configuration validation failed:');
            error.issues.forEach((issue) => {
                console.error(`- ${issue.path.join('.')}: ${issue.message}`);
            });
        }
        throw error;
    }
}
```

### Implementing Commands

```typescript
import { ICommandCreator, ICommandDefinition, IConvertCommandOptions } from '@subzilla/types';

export class MyCommandCreator implements ICommandCreator<IConvertCommandOptions> {
    create(): ICommandDefinition<IConvertCommandOptions> {
        return {
            name: 'my-command',
            description: 'My custom command',
            options: [
                {
                    flags: '-o, --output <path>',
                    description: 'Output file path',
                },
            ],
            action: async (options: IConvertCommandOptions) => {
                // Implementation
            },
        };
    }
}
```

## Development

### Building

```bash
yarn build
```

### Type Checking

```bash
yarn type-check
```

### Linting

```bash
yarn lint
yarn lint:fix
```

## Dependencies

- **zod**: Runtime validation and schema definition
- **@types/node**: Node.js type definitions (dev)
- **typescript**: TypeScript compiler (dev)

## Related Packages

- **[@subzilla/core](../core/README.md)**: Core subtitle processing functionality
- **[@subzilla/cli](../cli/README.md)**: Command-line interface

## License

ISC License - see the root [LICENSE](../../LICENSE) file for details.
