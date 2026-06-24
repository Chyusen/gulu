module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    '@react-native',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    'react-native/react-native': true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-native/no-unused-styles': 'warn',
    'no-console': 'off',
  },
  settings: {
    react: { version: 'detect' },
  },
  ignorePatterns: ['node_modules/', 'backend/', '*.json'],
};
