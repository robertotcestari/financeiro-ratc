import { createMiddleware } from 'hono/factory'

export const apiKeyAuth = createMiddleware(async (c, next) => {
  const token = process.env.API_KEY
  if (!token) {
    return c.json({ error: 'API_KEY not configured on server', status: 500 }, 500)
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Não autorizado', status: 401 }, 401)
  }

  const providedToken = authHeader.slice(7)
  if (providedToken !== token) {
    return c.json({ error: 'Não autorizado', status: 401 }, 401)
  }

  await next()
})
