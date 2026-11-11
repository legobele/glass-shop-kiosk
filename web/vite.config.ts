import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative base so the built app can be served from any static subpath
// (for example the GitHub Pages project site) with no server rewrites.
// Routing is hash-based for the same reason; see src/App.tsx.
export default defineConfig({
  base: './',
  plugins: [react()],
});
