const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const prettier = require('eslint-plugin-prettier');
const importPlugin = require('eslint-plugin-import');

module.exports = [
    js.configs.recommended,
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', '**/coverage/**', '**/.yarn/**'],
    },
    {
        files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                NodeJS: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
            prettier,
            import: importPlugin,
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: ['packages/*/tsconfig.json'],
                },
            },
        },
        rules: {
            ...typescriptEslint.configs.recommended.rules,
            'import/no-unresolved': 'off', // Disable for workspace packages
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-empty-object-type': 'off',
            'prettier/prettier': [
                'error',
                {
                    tabWidth: 4,
                },
            ],
            '@typescript-eslint/naming-convention': [
                'warn',
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                    prefix: ['I'],
                },
                {
                    selector: 'typeAlias',
                    format: ['PascalCase'],
                    prefix: ['T'],
                },
            ],
            'padding-line-between-statements': [
                'warn',
                {
                    blankLine: 'always',
                    prev: '*',
                    next: 'return',
                },
                {
                    blankLine: 'always',
                    prev: '*',
                    next: 'if',
                },
                {
                    blankLine: 'always',
                    prev: '*',
                    next: 'break',
                },
                {
                    blankLine: 'always',
                    prev: '*',
                    next: 'try',
                },
                {
                    blankLine: 'any',
                    prev: 'if',
                    next: 'if',
                },
                {
                    blankLine: 'always',
                    prev: '*',
                    next: ['const', 'let', 'var'],
                },
                {
                    blankLine: 'any',
                    prev: ['const', 'let', 'var'],
                    next: ['const', 'let', 'var'],
                },
                {
                    blankLine: 'any',
                    prev: ['multiline-const', 'multiline-let', 'multiline-var'],
                    next: '*',
                },
                {
                    blankLine: 'any',
                    prev: '*',
                    next: ['multiline-const', 'multiline-let', 'multiline-var'],
                },
                {
                    blankLine: 'always',
                    prev: '*',
                    next: 'block-like',
                },
                {
                    blankLine: 'always',
                    prev: ['const', 'let', 'var'],
                    next: 'expression',
                },
            ],
        },
    },
    {
        files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
            },
        },
        plugins: {
            prettier,
        },
        rules: {
            'prettier/prettier': [
                'error',
                {
                    tabWidth: 4,
                },
            ],
        },
    },
];
