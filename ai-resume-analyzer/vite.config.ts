import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: { outDir: 'demo', license: { fileName: 'third-party-licenses.txt' } },
  worker: { format: 'es' },
})
