import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { analyze, InputError, validateInput } from '../src/analysis.ts'

const host = '127.0.0.1'
const port = 4174
const origin = `http://${host}:${port}`
const limit = 384 * 1024
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wasm': 'application/wasm',
}

function json(response: ServerResponse, status: number, body: object) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(body))
}

async function analyzeRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    json(response, 415, { error: 'Send the résumé text as JSON.' })
    request.resume()
    return
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length
    if (size > limit) {
      response.setHeader('Connection', 'close')
      json(response, 413, { error: 'The request exceeds the size limit.' })
      return
    }
    chunks.push(chunk)
  }
  try {
    const input = validateInput(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    json(response, 200, analyze(input))
  } catch (error) {
    if (!(error instanceof InputError || error instanceof SyntaxError)) throw error
    json(response, 400, { error: error instanceof InputError ? error.message : 'Send valid JSON.' })
  }
}

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    if (request.headers.host !== `${host}:${port}` || (request.headers.origin && request.headers.origin !== origin)) {
      json(response, 403, { error: 'This API is available from the local app only.' })
      return
    }
    const { pathname } = new URL(request.url ?? '/', origin)
    if (pathname === '/api/health' && request.method === 'GET') return json(response, 200, { status: 'ok' })
    if (pathname === '/api/analyze' && request.method === 'POST') return await analyzeRequest(request, response)

    const asset = pathname.startsWith('/assets/') ? basename(pathname) : ''
    const file = pathname === '/' ? 'index.html' : /^[\w.-]+$/.test(asset) && !asset.startsWith('.') ? `assets/${asset}` : ''
    if (!file || request.method !== 'GET') return json(response, 404, { error: 'This route was not found.' })
    try {
      const content = await readFile(new URL(`../demo/${file}`, import.meta.url))
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
      response.end(content)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      json(response, 404, { error: 'File not found. Run npm run build before starting the server.' })
    }
  } catch {
    if (!response.headersSent) json(response, 500, { error: 'The local server could not complete the request.' })
    else response.destroy()
  }
})
server.requestTimeout = 15_000
server.listen(port, host, () => console.log(`Resume Lens local API demo at ${origin}`))
