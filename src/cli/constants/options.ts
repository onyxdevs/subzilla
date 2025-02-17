export const BASE_OPTIONS = [
    {
        flags: '-b, --backup',
        description: 'create backup of original file',
    },
    {
        flags: '--bom',
        description: 'add UTF-8 BOM to output file',
    },
    {
        flags: '--line-endings <type>',
        description: 'line endings type (lf, crlf, auto)',
    },
    {
        flags: '--overwrite-existing',
        description: 'overwrite existing output file',
    },
    {
        flags: '--retry-count <number>',
        description: 'number of retries on failure',
    },
    {
        flags: '--retry-delay <ms>',
        description: 'delay between retries in milliseconds',
    },
    {
        flags: '--strip-html',
        description: 'strip HTML tags',
    },
    {
        flags: '--strip-colors',
        description: 'strip color codes',
    },
    {
        flags: '--strip-styles',
        description: 'strip style tags',
    },
    {
        flags: '--strip-urls',
        description: 'replace URLs with [URL]',
    },
    {
        flags: '--strip-timestamps',
        description: 'replace timestamps with [TIMESTAMP]',
    },
    {
        flags: '--strip-numbers',
        description: 'replace numbers with #',
    },
    {
        flags: '--strip-punctuation',
        description: 'remove punctuation',
    },
    {
        flags: '--strip-emojis',
        description: 'replace emojis with [EMOJI]',
    },
    {
        flags: '--strip-brackets',
        description: 'remove brackets',
    },
    {
        flags: '--strip-bidi-control',
        description: 'remove bidirectional control characters (like U+202B)',
    },
    {
        flags: '--strip-all',
        description: 'strip all formatting (equivalent to all strip options)',
    },
];

export const CONVERT_OPTIONS = [
    ...BASE_OPTIONS,

    {
        flags: '-o, --output <outputFile>',
        description: 'path to save the converted file (optional)',
    },
];

export const BATCH_OPTIONS = [
    ...BASE_OPTIONS,

    {
        flags: '-o, --output-dir <dir>',
        description: 'output directory for converted files',
    },
    {
        flags: '-r, --recursive',
        description: 'search for files recursively',
    },
    {
        flags: '-p, --parallel',
        description: 'process files in parallel',
    },
    {
        flags: '-s, --skip-existing',
        description: 'skip files that already have a UTF-8 version',
    },
    {
        flags: '-d, --max-depth <depth>',
        description: 'maximum directory depth for recursive search',
    },
    {
        flags: '-i, --include-dirs <dirs...>',
        description: 'only process files in these directories',
    },
    {
        flags: '-x, --exclude-dirs <dirs...>',
        description: 'exclude files in these directories',
    },
    {
        flags: '--preserve-structure',
        description: 'preserve directory structure in output',
    },
];
