import { createClerkClient } from '@clerk/backend'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request) {
  const url = new URL(request.url)
  const origin = url.origin

  if (!process.env.CLERK_SECRET_KEY) {
    return Response.redirect(origin, 302)
  }

  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    })

    const requestState = await clerk.authenticateRequest(request, {
      authorizedParties: [
        origin,
        'http://localhost:3001',
        'http://localhost:5173',
      ],
    })

    const res = requestState.toResponse()

    if (requestState.status === 'signed-in') {
      const setCookie = res.headers.get('set-cookie')
      const headers = new Headers()
      headers.set('Location', origin + '/')
      if (setCookie) headers.set('Set-Cookie', setCookie)
      return new Response(null, { status: 302, headers })
    }

    return Response.redirect(origin, 302)
  } catch (err) {
    console.error('SSO callback error:', err.message)
    return Response.redirect(origin, 302)
  }
}
