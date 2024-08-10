/// <reference types="vitest" />
import { defineConfig, defaultExclude } from 'vitest/config'

export default defineConfig({
  test: {
    reporters: process.env.GITHUB_ACTIONS ? ['dot', 'github-actions'] : [],
    exclude: [
      ...defaultExclude,
      '**/*.bench.test.*'
    ],
  },
})
