import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-native': path.resolve(__dirname, './src/core/__mocks__/react-native.ts'),
      'expo-local-authentication': path.resolve(__dirname, './src/core/__mocks__/expo-local-authentication.ts'),
    },
  },
});
