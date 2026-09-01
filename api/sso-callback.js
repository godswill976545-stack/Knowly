import { createClerkClient } from '@clerk/backend'

export const runtime = 'nodejs'
export const maxDuration = 30

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
})

export async function GET(request) {
  const url = new URL(request.url)

  // If Clerk is not configured, redirect to home
  if (!process.env.CLERK_SECRET_KEY) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/' },
    })
  }

  try {
    const requestState = await clerk.authenticateRequest(request, {
      authorizedParties: [
        url.origin,
        'http://localhost:3001',
        'http://localhost:5173',
        'https://knowly-eta-ivory.vercel.app',
      ],
    })

    // If authenticated, proxy the response (sets cookies)
    if (requestState.status === 'signed-in') {
      return requestState.toResponse()
    }

    // If not authenticated, redirect home
    return new Response(null, {
      status: 302,
      headers: { Location: '/' },
    })
  } catch (err) {
    console.error('SSO callback error:', err.message)
    return new Response(null, {
      status: 302,
      headers: { Location: '/' },
    })
  }
}
