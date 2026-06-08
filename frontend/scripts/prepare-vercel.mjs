import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = join(scriptDir, '..')

const candidates = [
  join(frontendDir, '..', 'backend', 'server'),
  join(frontendDir, 'server'),
]

const source = candidates.find((path) => existsSync(path))
const target = join(frontendDir, 'server')

if (!source) {
  console.error('[FLUISOM] backend/server não encontrado. Tentou:', candidates.join(', '))
  process.exit(1)
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true })
}

cpSync(source, target, { recursive: true })
console.log('[FLUISOM] server copiado de', source, 'para', target)
