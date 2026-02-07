import js from '@eslint/js';
import globals from 'globals';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import css from '@eslint/css';
import html from '@html-eslint/eslint-plugin';
import htmlParser from '@html-eslint/parser';

export default [
    // Configuration for JavaScript files
    {
        files: ['**/*.{js,mjs,cjs}'],
        ...js.configs.recommended,
        ...prettierRecommended,
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            sourceType: 'module',
            ecmaVersion: 'latest',
        },
        rules: {},
    },
    // Configuration for HTML files
    {
        files: ['**/*.html'],
        plugins: {
            '@html-eslint': html,
        },
        languageOptions: {
            parser: htmlParser,
        },
        rules: {
            ...html.configs['flat/recommended'].rules,
        },
    },
    // Configuration for CSS files
    {
        files: ['**/*.css'],
        ...css.configs['flat/recommended'],
        rules: {},
    },
];
