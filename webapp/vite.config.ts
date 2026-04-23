import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'

// Vite proxy target for the gateway.
// The gateway runs over HTTP by default when started locally (GATEWAY_HTTPS is false unless explicitly set),
// so we default to http://localhost:8000 to avoid TLS-to-plain-HTTP errors (EPROTO wrong version number).
const gatewayTarget =
  process.env.VITE_GATEWAY_TARGET?.trim() ||
  process.env.VITE_API_URL?.trim() ||
  'http://localhost:8000';

const bypassSpaRoute = (path: string) => ({
  target: gatewayTarget,
  changeOrigin: true,
  secure: false,
  bypass(req: { method?: string; headers?: { accept?: string } }) {
    const acceptsHtml = req.headers?.accept?.includes('text/html');
    if (req.method === 'GET' && acceptsHtml) {
      return '/index.html';
    }

    return undefined;
  },
  rewrite: () => path,
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mkcert(), 
  ],

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'test/**',
      'load-tests/**',
    ],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
    },
  },

  server: {
    https: true as any,
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: gatewayTarget,
        changeOrigin: true,
        secure: false,
      },
      '/login': bypassSpaRoute('/login'),
      '/logout': bypassSpaRoute('/logout'),
      '/adduser': bypassSpaRoute('/adduser'),
      '/play': {
        target: gatewayTarget,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: gatewayTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  appType: "spa"
})
