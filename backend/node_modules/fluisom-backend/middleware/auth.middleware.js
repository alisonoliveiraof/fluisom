import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: 'Token não fornecido', code: 'UNAUTHORIZED' })
  }

  const token = header.slice(7)
  try {
    req.admin = jwt.verify(token, env.adminJwtSecret)
    next()
  } catch {
    return res.status(401).json({ error: true, message: 'Token inválido ou expirado', code: 'INVALID_TOKEN' })
  }
}
