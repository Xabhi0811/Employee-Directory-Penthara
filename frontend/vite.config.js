import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // PERFORMANCE: Enable Fast Refresh optimization
      fastRefresh: true,
      // PERFORMANCE: Exclude node_modules from babel transform
      exclude: /node_modules/,
    }),
    
    // PERFORMANCE: Gzip compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // Only compress files larger than 1KB
      deleteOriginFile: false, // Keep original files
    }),
    
    // PERFORMANCE: Brotli compression (better than gzip)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],
  server: {
    port: 5173,
    // Fail loudly if 5173 is taken instead of silently moving to 5174+.
    // The backend CORS whitelist is origin-exact, so a drifting dev-server port
    // breaks every credentialed API call with an opaque CORS error.
    strictPort: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    
    // PERFORMANCE OPTIMIZATIONS
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
      },
      mangle: true, // Mangle variable names for smaller size
      format: {
        comments: false, // Remove comments
      },
    },
    
    // PERFORMANCE: Code splitting and chunking strategy
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: (id) => {
          // Vendor chunks - libraries that rarely change
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@heroicons')) {
              return 'ui-vendor';
            }
            if (id.includes('axios')) {
              return 'utils-vendor';
            }
            // Other node_modules go to vendor
            return 'vendor';
          }
        },
        
        // Naming strategy for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    
    // PERFORMANCE: Chunk size warnings
    chunkSizeWarningLimit: 500, // Warn if chunks exceed 500KB
    
    // PERFORMANCE: Enable CSS code splitting
    cssCodeSplit: true,
    
    // PERFORMANCE: Optimize asset inlining
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB as base64
    
    // PERFORMANCE: Report compressed size
    reportCompressedSize: true,
    
    // PERFORMANCE: Target modern browsers for smaller output
    target: 'es2015',
  },
  
  // PERFORMANCE: Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
    exclude: [], // No exclusions
  },
});
