export function runInBackground(task) {
  const run = () => task().catch((err) => console.error('[FLUISOM] Background task failed:', err.message))

  if (process.env.VERCEL === '1') {
    return import('@vercel/functions')
      .then(({ waitUntil }) => waitUntil(run()))
      .catch(() => run())
  }

  run()
}

export function isServerless() {
  return process.env.VERCEL === '1'
}
