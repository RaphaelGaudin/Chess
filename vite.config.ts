import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' so the build works on any sub-path (GitHub Pages, etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
})
