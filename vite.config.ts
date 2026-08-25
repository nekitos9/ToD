import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/truth-or-dare/',
  plugins: [react()],
})
