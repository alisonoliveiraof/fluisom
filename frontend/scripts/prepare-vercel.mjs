import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const frontendDir = join(root, '..')
const source = join(frontendDir, '..', 'backend', 'server')
const target = join(frontendDir, 'server')

if (!existsSync(source)) {
  console.error('[FLUISOM] backend/server não encontrado:', source)
  process.exit(1)
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true })
}

cpSync(source, target, { recursive: true })
console.log('[FLUISOM] server copiado para frontend/server')
