import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/** Copia index.html → 404.html (GitHub Pages e hosts estáticos). */
function spaFallback404() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist')
      const index = resolve(outDir, 'index.html')
      if (existsSync(index)) {
        copyFileSync(index, resolve(outDir, '404.html'))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('vturb-'),
        },
      },
    }),
    tailwindcss(),
    spaFallback404(),
  ],
})
