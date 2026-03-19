import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/-BRIEF-TECNICO-CosmoNet-Trend-Scout/', // nome esatto del repo GitHub
  plugins: [react(), tailwindcss()],
})
