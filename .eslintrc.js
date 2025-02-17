const tsconfig = require('./tsconfig.json');

module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'prettier', 'import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
    ],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    settings: {
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                alias: tsconfig.compilerOptions.paths,
            },
        },
    },
    rules: {
        'import/no-unresolved': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
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
};
