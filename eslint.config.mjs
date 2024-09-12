import eslint from '@eslint/js';
import parser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import importing from 'eslint-plugin-import-x';
import * as typescript from 'typescript-eslint';

export default typescript.config(
  eslint.configs.recommended,
  prettier,
  ...typescript.configs.strict,
  ...typescript.configs.stylistic,
  importing.flatConfigs.recommended,
  importing.flatConfigs.typescript,
  /**
   * Common
   */
  {
    languageOptions: {
      ecmaVersion: 'latest',
      parser: parser,
      sourceType: 'module',
    },
    plugins: { import: importing },
    rules: {
      ...prettier.rules,
      'import/order': [
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
   * Testing Library
   */
  // {
  //   files: ['**/*.{test,spec}.*'],
  //   ...rtl.configs.recommended,
  //   ...rtl.configs.dom,
  //   ...rtl.configs.react,
  // }
);
