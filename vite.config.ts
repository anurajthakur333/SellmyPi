// Setup magic for your React app
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Plugins make React work smoothly
  plugins: [react()],
  server: {
    // Auto-launch in Chrome when you start dev server
    open: 'google chrome'
  },
})