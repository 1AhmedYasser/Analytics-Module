import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
// @ts-ignore
import path from 'path';

// https://vitejs.dev/config/
export default ({ mode }) => {
  process.env = Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return defineConfig({
    envPrefix: 'REACT_APP_',
    plugins: [
      react(),
      tsconfigPaths(),
      svgr(),
    ],
    optimizeDeps: {
      include: ['howler'],
      esbuildOptions: {
        jsx: 'automatic',
      },
    },
    esbuild: {
      jsx: 'automatic',
    },
    base: '/analytics',
    server: {
      watch: {
        usePolling: true,
      },
      host: true,
      strictPort: true,
      port: parseInt(process.env.REACT_APP_APP_PORT),
      headers: {
        ...(process.env.REACT_APP_CSP && {
          'Content-Security-Policy': process.env.REACT_APP_CSP,
        }),
      },
    },
    build: {
      outDir: './build',
      target: 'es2015',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '~@fontsource': path.resolve(__dirname, 'node_modules/@fontsource'),
        '@': `${path.resolve(__dirname, './src')}`,
      },
    },
  });
};
