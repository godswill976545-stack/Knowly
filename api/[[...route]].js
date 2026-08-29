import app from '../server/app.js'

export const runtime = 'nodejs'
export const maxDuration = 60

const handler = (request) => app.fetch(request)

export const GET = handler
export const POST = handler
export const PATCH = handler
export const PUT = handler
export const DELETE = handler
export const OPTIONS = handler
export const HEAD = handler
