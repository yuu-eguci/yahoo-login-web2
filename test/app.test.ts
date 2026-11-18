import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, describe, test } from 'node:test'
import { createClient } from './support/http-client.ts'
import { fixtures, startMockYahooServer } from './support/mock-yahoo.ts'

type MockYahoo = Awaited<ReturnType<typeof startMockYahooServer>>

let mock: MockYahoo
let server: Server
let origin: string

const useYahooOrigin = (yahooOrigin: string): void => {
  process.env.YAHOO_AUTH_ORIGIN = yahooOrigin
  process.env.YAHOO_USERINFO_ORIGIN = yahooOrigin
}

const extractState = (html: string): string => {
  const match = /state: '([^']*)'/.exec(html)
  assert.ok(match?.[1], 'state should be embedded in the login page')
  return match[1]
}

// Opens the top page and returns the client together with the state stored in its session.
const openTopPage = async () => {
  const client = createClient(origin)
  const res = await client.request('/')
  assert.equal(res.status, 200)
  return { client, state: extractState(await res.text()) }
}

before(async () => {
  mock = await startMockYahooServer()
  useYahooOrigin(mock.origin)
  process.env.YAHOO_CLIENT_ID = fixtures.clientId
  process.env.YAHOO_CLIENT_SECRET = fixtures.clientSecret
  process.env.SESSION_MAX_AGE_MS = '60000'
  const { default: app } = await import('../app.ts')
  server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => server.once('listening', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(async () => {
  // Close whatever was started, even when the setup failed half-way.
  await mock?.close()
  if (server !== undefined) {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

beforeEach(() => {
  useYahooOrigin(mock.origin)
  mock.requests.length = 0
})

describe('top page', () => {
  test('renders the Yahoo login button settings with a fresh state', async () => {
    const client = createClient(origin)
    const res = await client.request('/')
    const html = await res.text()

    assert.equal(res.status, 200)
    assert.match(html, new RegExp(`clientId: '${fixtures.clientId}'`))
    assert.match(html, new RegExp(`redirectUri: '${origin}/inspection'`))
    assert.equal(extractState(html).length, 11)
    assert.ok(client.cookie, 'a session cookie should be issued')
  })
})

describe('login flow', () => {
  test('exchanges the code, shows mypage and logs out', async () => {
    const { client, state } = await openTopPage()
    const cookieBeforeLogin = client.cookie

    const callback = await client.request(`/inspection?code=${fixtures.code}&state=${encodeURIComponent(state)}`)
    assert.equal(callback.status, 302)
    assert.equal(callback.headers.get('location'), '/mypage')
    assert.notEqual(client.cookie, cookieBeforeLogin, 'session should be regenerated after login')
    assert.deepEqual(
      mock.requests.map((r) => `${r.method} ${r.path}`),
      ['POST /yconnect/v2/token', 'GET /yconnect/v2/public-keys', 'GET /yconnect/v2/attribute'],
    )

    const mypage = await client.request('/mypage')
    assert.equal(mypage.status, 200)
    assert.match(await mypage.text(), new RegExp(`Hi ${fixtures.email}!`))

    const top = await client.request('/')
    assert.equal(top.status, 302)
    assert.equal(top.headers.get('location'), '/mypage')

    const logout = await client.request('/logout')
    assert.equal(logout.status, 200)
    assert.match(await logout.text(), /Logged out/)

    const afterLogout = await client.request('/mypage')
    assert.equal(afterLogout.status, 404)
  })

  test('rejects a callback whose state does not match the session', async () => {
    const { client } = await openTopPage()

    const res = await client.request(`/inspection?code=${fixtures.code}&state=forged-state`)

    assert.equal(res.status, 404)
    assert.deepEqual(mock.requests, [], 'no token request should be sent')
  })

  test('rejects a callback without a code', async () => {
    const { client, state } = await openTopPage()

    const res = await client.request(`/inspection?state=${encodeURIComponent(state)}`)

    assert.equal(res.status, 404)
    assert.deepEqual(mock.requests, [])
  })

  test('does not authenticate when the token endpoint returns an error', async () => {
    const { client, state } = await openTopPage()

    const res = await client.request(`/inspection?code=unknown-code&state=${encodeURIComponent(state)}`)

    assert.equal(res.status, 404)
    assert.deepEqual(mock.requests.map((r) => r.path), ['/yconnect/v2/token'])
    assert.equal((await client.request('/mypage')).status, 404)
  })

  test('does not authenticate when the UserInfo endpoint fails', async () => {
    const failing = await startMockYahooServer({ failingPaths: ['/yconnect/v2/attribute'] })
    try {
      useYahooOrigin(failing.origin)
      const { client, state } = await openTopPage()

      const res = await client.request(`/inspection?code=${fixtures.code}&state=${encodeURIComponent(state)}`)

      assert.equal(res.status, 404)
      assert.equal((await client.request('/mypage')).status, 404)
    } finally {
      await failing.close()
    }
  })
})

describe('mypage', () => {
  test('is not shown to an unauthenticated user', async () => {
    const res = await createClient(origin).request('/mypage')

    assert.equal(res.status, 404)
    assert.match(await res.text(), /User is not authenticated\./)
  })
})

describe('test page', () => {
  test('reports OK when the discovery document is reachable twice', async () => {
    const res = await createClient(origin).request('/test')

    assert.equal(res.status, 200)
    assert.match(await res.text(), /First OK Second OK/)
    assert.equal(mock.requests.length, 2)
  })

  test('reports NG when the discovery document cannot be fetched', async () => {
    const failing = await startMockYahooServer({
      failingPaths: ['/yconnect/v2/.well-known/openid-configuration'],
    })
    try {
      useYahooOrigin(failing.origin)

      const res = await createClient(origin).request('/test')

      assert.match(await res.text(), /<p>NG<\/p>/)
    } finally {
      await failing.close()
    }
  })
})

describe('unknown pages', () => {
  test('render the 404 error page', async () => {
    const res = await createClient(origin).request('/no-such-page')

    assert.equal(res.status, 404)
    assert.match(await res.text(), /Not Found/)
  })

  test('static files are still served', async () => {
    const res = await createClient(origin).request('/stylesheets/style.css')

    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /text\/css/)
  })
})
