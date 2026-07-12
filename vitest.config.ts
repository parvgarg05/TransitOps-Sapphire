import { defineConfig } from 'vitest/config'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env
dotenv.config()

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
