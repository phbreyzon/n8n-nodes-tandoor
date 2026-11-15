// ESLint Flat Config for TypeScript and n8n nodes (ESM)
import tseslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import n8nPlugin from 'eslint-plugin-n8n-nodes-base';

export default [
  // Base recommendations for TypeScript (flat config)
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: false,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'n8n-nodes-base': n8nPlugin,
    },
    rules: {},
  },
];
