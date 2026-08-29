import app from '../../server/app.js'
export const runtime = 'nodejs'
export const maxDuration = 60
const handler = (request) => app.fetch(request)
export const GET = handler
export const POST = handler
