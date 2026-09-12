// ESLint (flat config) for DUAA | دعاء — Expo SDK 57.
// https://docs.expo.dev/guides/using-eslint/
//
// The Expo preset already covers React/React Native/TypeScript/import hygiene.
// Additions below are project rules, not stylistic noise:
//   * design tokens are mandatory — raw hex colours are banned outside the token
//     files that define them;
//   * service backends must be reached through the registry, never imported
//     directly into a screen or component (keeps the Firebase swap possible);
//   * fabricated-content guards live in tests, but accidental `console.log`
//     leaks are errors here.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      'web-build/**',
      '.expo/**',
      'node_modules/**',
      'assets/**',
      'coverage/**',
      'expo-env.d.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Tokens are the single source of visual truth (design/tokens/*).
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            'Hardcoded colour literal — add it to src/design/tokens/ and reference the token instead.',
        },
      ],
    },
  },
  {
    // The token definitions are allowed to contain literal colours.
    files: ['src/design/tokens/**', 'scripts/**'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Screens and components must go through the service registry so the
    // backend can be swapped without touching UI code.
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx', 'src/features/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/impl/*'],
              message:
                'UI must not import a concrete backend — resolve it through the service registry (@/services/registry) instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // Node/CJS build + tooling files legitimately use Node globals.
    files: ['*.config.js', 'jest.*.config.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    // The logger is the single sanctioned console sink — it is allowed to write
    // to console.log/info/debug, everything else must go through it.
    files: ['src/core/utils/logger.ts'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'log', 'info', 'debug'] }],
    },
  },
  {
    // Test doubles: jest.mock factories are CommonJS by design, stub components
    // are anonymous on purpose, and fixtures may carry literal values.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react/display-name': 'off',
      'no-restricted-syntax': 'off',
    },
  },
]);
