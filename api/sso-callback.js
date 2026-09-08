import { createClerkClient } from '@clerk/backend'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request) {
  const url = new URL(request.url)
  const origin = url.origin

  const secretKey = process.env.CLERK_SECRET_KEY
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!secretKey) {
    console.warn('SSO callback: missing CLERK_SECRET_KEY')
    return Response.redirect(origin + '/', 302)
  }

  try {
    const clerk = createClerkClient({
      secretKey,
      publishableKey,
    })

    const requestState = await clerk.authenticateRequest(request, {
      authorizedParties: [
        origin,
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173',
      ],
    })

    // Clerk's authenticateRequest returns a RequestState with `headers` containing
    // handshake cookies when status is 'handshake'. `toResponse()` does NOT exist
    // on this SDK version – we use `requestState.headers` directly.
    const stateHeaders = requestState.headers
    if (stateHeaders) {
      let cookies = []
      if (typeof stateHeaders.getSetCookie === 'function') {
        cookies = stateHeaders.getSetCookie()
      } else {
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
        // Preserve other important headers if present
        return new Response(null, { status: 302, headers })
      }
    }

    // For handshake without cookies (rare) or signed-in, just redirect home.
    // Clerk JS will finalize session client-side.
    return Response.redirect(origin + '/', 302)
  } catch (err) {
    console.error('SSO callback error:', err.message, err.stack)
    return Response.redirect(origin + '/', 302)
  }
}

// Clerk may hit this with POST in some flows; handle identically
export const POST = GET
export const HEAD = GET
