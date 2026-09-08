import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './app.js'
import { createClerkClient } from '@clerk/backend'

async function handleSsoCallback(request) {
  const url = new URL(request.url)
  const origin = url.origin
  const secretKey = process.env.CLERK_SECRET_KEY
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!secretKey) {
    return Response.redirect(origin + '/', 302)
  }
  try {
    const clerk = createClerkClient({ secretKey, publishableKey })
    const requestState = await clerk.authenticateRequest(request, {
      authorizedParties: [
        origin,
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173',
      ],
    })
    const stateHeaders = requestState.headers
    if (stateHeaders) {
      let cookies = []
      if (typeof stateHeaders.getSetCookie === 'function') cookies = stateHeaders.getSetCookie()
      else {
        const collected = []
        try {
          stateHeaders.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') collected.push(value)
          })
        } catch {}
        if (collected.length) cookies = collected
        else {
          const single = stateHeaders.get('set-cookie')
          if (single) cookies = [single]
        }
      }
      if (cookies.length > 0) {
        const headers = new Headers()
        headers.set('Location', origin + '/')
        cookies.forEach((c) => headers.append('Set-Cookie', c))
        return new Response(null, { status: 302, headers })
      }
    }
    return Response.redirect(origin + '/', 302)
  } catch (err) {
    console.error('SSO callback error (dev server):', err.message)
    return Response.redirect(new URL(request.url).origin + '/', 302)
  }
}

const port = Number(process.env.PORT) || 3001
serve({ fetch: async (request) => {
  const url = new URL(request.url)
  if (url.pathname === '/sso-callback' || url.pathname === '/api/sso-callback') {
    return handleSsoCallback(request)
  }
  return app.fetch(request)
}, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`)
})
