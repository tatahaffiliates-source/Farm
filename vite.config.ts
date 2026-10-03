import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'kistos-pig-farm.png',
          'icons/kistos-pig-farm-32.png',
          'icons/kistos-pig-farm-apple.png',
        ],
        manifest: {
          name: 'Kisto’s pig farm',
          short_name: "Kisto's Farm",
          description:
            'Harvesting healthy choices — track livestock, breeding, health, feed inventory, sales, expenses, and financial performance for your pig farm.',
          theme_color: '#16a34a',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icons/kistos-pig-farm-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/kistos-pig-farm-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/kistos-pig-farm-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
