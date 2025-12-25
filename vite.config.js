import { defineConfig } from 'vite';

export default defineConfig({
    base: '/penguin-ice/', // Correct base path for GitHub Pages
    build: {
        outDir: 'dist',
    }
});
