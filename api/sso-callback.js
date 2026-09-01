import { createClerkClient } from '@clerk/backend'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request) {
  const url = new URL(request.url)

  if (!process.env.CLERK_SECRET_KEY) {
    return Response.redirect(url.origin, 302)
  }

  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    })

    const requestState = await clerk.authenticateRequest(request, {
      authorizedParties: [
        url.origin,
        'http://localhost:3001',
        'http://localhost:5173',
      ],
    })

    const response = requestState.toResponse()

    if (requestState.status === 'signed-in') {
      return response
    }

    return Response.redirect(url.origin, 302)
  } catch (err) {
    console.error('SSO callback error:', err.message)
    return Response.redirect(url.origin, 302)
  }
}
