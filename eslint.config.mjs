import expoConfig from 'eslint-config-expo/flat';
import prettierConfig from 'eslint-config-prettier';

export default [
  ...expoConfig,
  prettierConfig,
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'dist/',
      'supabase/functions/',
      'coverage/',
    ],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
