import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import * as importing from 'eslint-plugin-import-x';
import unicorn from 'eslint-plugin-unicorn';
import * as typescript from 'typescript-eslint';

export default typescript.config(
  eslint.configs.recommended,
  prettier,
  ...typescript.configs.strict,
  ...typescript.configs.stylistic,
  importing.flatConfigs.recommended,
  importing.flatConfigs.typescript,
  unicorn.configs.recommended,
  /**
   * Common
   */
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'curly': ['error', 'all'],
      'eqeqeq': 'error',
      'import-x/order': [
        'error',
        {
          'alphabetize': {
            caseInsensitive: true,
            order: 'asc',
          },
          'groups': [
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling'],
            'type',
          ],
          'newlines-between': 'always',
          'pathGroups': [
            {
              group: 'internal',
              pattern: '@/**',
            },
          ],
          'pathGroupsExcludedImportTypes': ['@/**'],
        },
      ],
      'no-async-promise-executor': 'warn',
      'no-console': 'warn',
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      'sort-keys': 'error',
    },
  },
  /**
   * TypeScript
   */
  {
    files: ['**/*.{mts,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.json'],
        },
      },
    },
  },
  /**
   * Grammar file
   */
  {
    files: ['**/grammar.cjs'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  /**
   * Tests
   */
  {
    files: ['**/__tests__/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
      'sort-keys': 'off',
      'vitest/valid-title': 'off',
    },
  },
);
