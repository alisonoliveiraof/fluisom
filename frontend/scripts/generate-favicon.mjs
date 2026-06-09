import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../public')
const logoPath = path.join(publicDir, 'Logo - Fluisom sem fundo.png')
const faviconPath = path.join(publicDir, 'favicon.png')

const size = 192
const padding = 16

const logo = sharp(logoPath)
const logoMeta = await logo.metadata()
const inner = size - padding * 2
const scale = Math.min(inner / logoMeta.width, inner / logoMeta.height)
const resizedW = Math.round(logoMeta.width * scale)
const resizedH = Math.round(logoMeta.height * scale)
const left = Math.round((size - resizedW) / 2)
const top = Math.round((size - resizedH) / 2)

const resizedLogo = await logo.resize(resizedW, resizedH).png().toBuffer()

await sharp({
  create: {
    width: size,
    height: size,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([{ input: resizedLogo, left, top }])
  .png()
  .toFile(faviconPath)

console.log('favicon.png gerado com fundo branco')
