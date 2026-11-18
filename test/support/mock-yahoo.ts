// Local stand-in for the Yahoo! ID 連携 (YConnect v2) endpoints used by the app.
// It only serves synthetic fixtures so that tests and Docker checks never reach real Yahoo services.
import http from 'node:http'
import type { AddressInfo } from 'node:net'

export const fixtures = {
  clientId: 'synthetic-client-id',
  clientSecret: 'synthetic-client-secret',
  code: 'synthetic-authorization-code',
  accessToken: 'synthetic-access-token',
  kid: 'synthetic-key-id',
  sub: 'synthetic-user-sub',
  email: 'synthetic.user@example.test',
} as const

export interface MockYahooOptions {
  clientId?: string
  clientSecret?: string
  // Endpoints listed here answer with HTTP 500 so that error paths can be tested.
  failingPaths?: string[]
}

export interface RecordedRequest {
  method: string
  path: string
}

const base64url = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url')

const sendJson = (res: http.ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readBody = async (req: http.IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString()
}

export const createMockYahooServer = (options: MockYahooOptions = {}) => {
  const clientId = options.clientId ?? fixtures.clientId
  const clientSecret = options.clientSecret ?? fixtures.clientSecret
  const failingPaths = new Set(options.failingPaths ?? [])
  const requests: RecordedRequest[] = []

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://mock.invalid')
    requests.push({ method: req.method ?? '', path: url.pathname })

    if (failingPaths.has(url.pathname)) {
      sendJson(res, 500, { error: 'server_error' })
      return
    }

    if (req.method === 'POST' && url.pathname === '/yconnect/v2/token') {
      const expected = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      if (req.headers.authorization !== expected) {
        sendJson(res, 401, { error: 'invalid_client' })
        return
      }
      const form = new URLSearchParams(await readBody(req))
      if (
        form.get('grant_type') !== 'authorization_code' ||
        form.get('code') !== fixtures.code ||
        !form.get('redirect_uri')?.endsWith('/inspection')
      ) {
        sendJson(res, 400, { error: 'invalid_grant' })
        return
      }
      const now = Math.floor(Date.now() / 1000)
      const idToken = [
        base64url({ typ: 'JWT', alg: 'RS256', kid: fixtures.kid }),
        base64url({ iss: 'mock-yahoo', sub: fixtures.sub, aud: [clientId], exp: now + 600, iat: now }),
        Buffer.from('synthetic-signature').toString('base64url'),
      ].join('.')
      sendJson(res, 200, {
        access_token: fixtures.accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'synthetic-refresh-token',
        id_token: idToken,
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/yconnect/v2/public-keys') {
      sendJson(res, 200, {
        [fixtures.kid]: '-----BEGIN PUBLIC KEY-----\nsynthetic\n-----END PUBLIC KEY-----\n',
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/yconnect/v2/attribute') {
      if (req.headers.authorization !== `Bearer ${fixtures.accessToken}`) {
        sendJson(res, 401, { error: 'invalid_token' })
        return
      }
      sendJson(res, 200, { sub: fixtures.sub, email: fixtures.email, email_verified: true })
      return
    }

    if (req.method === 'GET' && url.pathname === '/yconnect/v2/.well-known/openid-configuration') {
      sendJson(res, 200, { issuer: 'mock-yahoo', response_types_supported: ['code'] })
      return
    }

    sendJson(res, 404, { error: 'not_found' })
  })

  return { server, requests }
}

// Starts the mock on an ephemeral local port and returns its origin.
export const startMockYahooServer = async (options: MockYahooOptions = {}) => {
  const mock = createMockYahooServer(options)
  await new Promise<void>((resolve) => mock.server.listen(0, '127.0.0.1', resolve))
  const { port } = mock.server.address() as AddressInfo
  return {
    ...mock,
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => mock.server.close(() => resolve())),
  }
}
