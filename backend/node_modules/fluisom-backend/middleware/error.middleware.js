export function errorMiddleware(err, req, res, _next) {
  console.error('[FLUISOM] Erro:', err.message)
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack)
  }

  const status = err.status || err.statusCode || 500
  const body = {
    error: true,
    message: err.message || 'Erro interno do servidor',
    code: err.code || 'INTERNAL_ERROR',
  }
  res.status(status).json(body)
}

export function notFoundMiddleware(req, res) {
  res.status(404).json({ error: true, message: 'Rota não encontrada', code: 'NOT_FOUND' })
}
