// eslint.config.js

import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from '@typescript-eslint/eslint-plugin';

export default defineConfig([
	{
		files: ["**/*.ts"],
        plugins: {
			tseslint
		},
		languageOptions: {
            parser: '@typescript-eslint/parser',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                project: './tsconfig.json',
                ecmaVersion: 2015,
                sourceType: 'module',
            },
        },
        rules: {
        '@typescript-eslint/indent': ['error', 'tab'],
        '@typescript-eslint/member-delimiter-style': ['error', {
            multiline: { delimiter: 'semi', requireLast: true },
            singleline: { delimiter: 'semi', requireLast: false },
        }],
        '@typescript-eslint/semi': ['error', 'always'],
        },
	},
]);
