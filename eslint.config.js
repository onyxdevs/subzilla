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
        files: [
            'packages/*/src/**/*.ts',
            'packages/*/src/**/*.tsx',
            'packages/*/__tests__/**/*.ts',
            'packages/*/jest.setup.ts',
        ],
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
                // Jest globals for test files
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                jest: 'readonly',
                // Node.js globals for test files
                __dirname: 'readonly',
                __filename: 'readonly',
                require: 'readonly',
                global: 'readonly',
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
            // 🚀 Comprehensive import ordering
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    pathGroups: [
                        {
                            pattern: '@subzilla/**',
                            group: 'internal',
                            position: 'before',
                        },
                        // Treat all parent imports as one subgroup
                        {
                            pattern: '../**',
                            group: 'parent',
                            position: 'before',
                        },
                        // Treat all sibling imports as separate subgroup after parent
                        {
                            pattern: './**',
                            group: 'parent', // Same group as parent to avoid line break
                            position: 'after',
                        },
                    ],
                    pathGroupsExcludedImportTypes: ['@subzilla'],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                    distinctGroup: false,
                },
            ],
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-require-imports': 'off', // Allow require() in test files
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
                    next: 'continue',
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
        // Test files: Relaxed import ordering for testing priorities
        files: [
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
            '**/jest.setup.ts',
            '**/jest.setup.tsx',
            '**/setup-tests.ts',
            '**/setup-tests.tsx',
        ],
        plugins: {
            import: importPlugin,
        },
        rules: {
            // Disable strict import ordering for test files
            'import/order': 'off',
            // Allow var declarations in test files
            'no-var': 'off',
            // Allow empty functions in test files (useful for mocks and stubs)
            '@typescript-eslint/no-empty-function': 'off',
        },
    },
    {
        // Browser/Renderer JavaScript files (Electron renderer process)
        files: ['packages/mac/src/renderer/**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script', // Renderer files use script mode
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                alert: 'readonly',
                confirm: 'readonly',
                prompt: 'readonly',
                // DOM globals
                Element: 'readonly',
                HTMLElement: 'readonly',
                Event: 'readonly',
                MouseEvent: 'readonly',
                KeyboardEvent: 'readonly',
                // Additional browser APIs
                fetch: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
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
            // Relax some rules for renderer files
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
    {
        // Node.js JavaScript files
        files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
        ignores: ['packages/mac/src/renderer/**/*.js'], // Exclude renderer files
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
