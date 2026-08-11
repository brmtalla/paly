import expoConfig from 'eslint-config-expo/flat.js';
import prettierConfig from 'eslint-config-prettier';

export default [
  ...expoConfig,
  prettierConfig,
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'dist/',
      // Deno runtime — different globals and remote imports.
      'supabase/functions/',
      'landing/dist/',
      'coverage/',
    ],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The TypeScript plugin is only registered for TS files by the Expo config.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
