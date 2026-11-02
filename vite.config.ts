import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    // Pre-bundle the heavy client deps up front so a cold dev start doesn't
    // discover-and-rebundle them lazily (which triggers a full page reload
    // mid-session).
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'recharts',
        'motion/react',
        'date-fns',
        'lucide-react',
        '@neon/auth',
      ],
    },
    build: {
      // Modern, evergreen-browser app (React 19). es2022 matches tsconfig's
      // target; not using `esnext` so output stays broadly loadable.
      target: 'es2022',
      // esbuild is Vite 6's default minifier and is far faster than terser.
      // Set explicitly so the choice is documented and can't silently change.
      minify: 'esbuild' as const,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Split vendor code so an app-only change doesn't invalidate the
          // entire bundle. Keep react + react-dom together (a split would risk
          // duplicate React instances / broken hooks).
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
            auth: ['@neon/auth'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
