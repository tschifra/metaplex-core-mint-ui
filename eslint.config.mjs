import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    ...nextPlugin.configs['core-web-vitals'],
    files: ['**/*.{js,jsx,ts,tsx}'],
  },
  {
    ...reactHooks.configs.flat['recommended-latest'],
    files: ['**/*.{js,jsx,ts,tsx}'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['jest.setup.js', '**/__tests__/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    rules: {
      // Wallet/RPC subscriptions intentionally synchronize external state in
      // effects. This opt-in React Compiler rule is not a correctness rule and
      // flagging these integrations would encourage race-prone rewrites.
      'react-hooks/set-state-in-effect': 'off',
      // This legacy page intentionally closes over the mint controller state.
      // Extracting its large local view without a dedicated refactor would
      // duplicate the state contract and is outside a dependency hardening pass.
      'react-hooks/static-components': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'coverage/**',
    'out/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
