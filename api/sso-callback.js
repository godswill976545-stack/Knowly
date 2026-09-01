export const runtime = 'nodejs'

export async function GET(request) {
  const url = new URL(request.url)
  return Response.redirect(url.origin + '/', 302)
}
