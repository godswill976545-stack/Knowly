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

    // Try to get handshake response which contains Set-Cookie for session.
    // In newer Clerk versions this handles the handshake/interstitial correctly.
    let handshakeRes = null
    try {
      if (typeof requestState.toResponse === 'function') {
        handshakeRes = requestState.toResponse()
      }
    } catch (e) {
      console.warn('toResponse failed:', e.message)
    }

    if (handshakeRes && handshakeRes.headers) {
      const headers = new Headers()
      headers.set('Location', origin + '/')

      // Forward all Set-Cookie headers (Clerk may set __session, __client_uat, __clerk_db_jwt etc.)
      let cookies = []
      if (typeof handshakeRes.headers.getSetCookie === 'function') {
        cookies = handshakeRes.headers.getSetCookie()
      } else {
        // Fallback: try to collect via iteration
        const collected = []
        try {
          handshakeRes.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') collected.push(value)
          })
        } catch {}
        if (collected.length) cookies = collected
        else {
          const single = handshakeRes.headers.get('set-cookie')
          if (single) cookies = [single]
        }
      }

      cookies.forEach((c) => headers.append('Set-Cookie', c))

      // If we have cookies, redirect with them. This ensures session is persisted.
      if (cookies.length > 0) {
        return new Response(null, { status: 302, headers })
      }

      // If handshakeRes is already a redirect (e.g. handshake -> interstitial), forward its location
      if (handshakeRes.status >= 300 && handshakeRes.status < 400) {
        const loc = handshakeRes.headers.get('location') || origin + '/'
        headers.set('Location', loc)
        return new Response(null, { status: handshakeRes.status, headers })
      }
    }

    // If directly signed-in (no handshake needed) or handshake without cookies, just redirect home.
    // Clerk JS will pick up session via client-side handshake as fallback.
    if (requestState.status === 'signed-in' || requestState.status === 'handshake') {
      return Response.redirect(origin + '/', 302)
    }

    return Response.redirect(origin + '/', 302)
  } catch (err) {
    console.error('SSO callback error:', err.message, err.stack)
    return Response.redirect(origin + '/', 302)
  }
}

// Clerk may hit this with POST in some flows; handle identically
export const POST = GET
export const HEAD = GET
