import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { parseSessionMaxAge } from '../lib/session.ts'
import { decodeIdToken, yahooEndpoints } from '../lib/yahoo.ts'

describe('yahooEndpoints', () => {
  test('uses the Yahoo! ID 連携 v2 endpoints by default', () => {
    assert.deepEqual(yahooEndpoints({}), {
      token: 'https://auth.login.yahoo.co.jp/yconnect/v2/token',
      publicKeys: 'https://auth.login.yahoo.co.jp/yconnect/v2/public-keys',
      openIdConfiguration: 'https://auth.login.yahoo.co.jp/yconnect/v2/.well-known/openid-configuration',
      userInfo: 'https://userinfo.yahooapis.jp/yconnect/v2/attribute',
    })
  })

  test('can point to other origins such as a local mock', () => {
    const endpoints = yahooEndpoints({
      YAHOO_AUTH_ORIGIN: 'http://localhost:4000/',
      YAHOO_USERINFO_ORIGIN: 'http://localhost:4001',
    })

    assert.equal(endpoints.token, 'http://localhost:4000/yconnect/v2/token')
    assert.equal(endpoints.userInfo, 'http://localhost:4001/yconnect/v2/attribute')
  })
})

describe('decodeIdToken', () => {
  test('decodes the header and payload of an ID Token', () => {
    const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const idToken = `${part({ alg: 'RS256', kid: 'k1' })}.${part({ sub: 's1', nonce: 'n1' })}.c2ln`

    const decoded = decodeIdToken(idToken)

    assert.equal(decoded.header.kid, 'k1')
    assert.equal(decoded.header.alg, 'RS256')
    assert.equal(decoded.payload.sub, 's1')
    assert.equal(decoded.signature, 'sig')
  })

  test('throws for a value that is not a JWT', () => {
    assert.throws(() => decodeIdToken('not-a-jwt'))
  })
})

describe('parseSessionMaxAge', () => {
  test('returns milliseconds for a numeric value', () => {
    assert.equal(parseSessionMaxAge('60000'), 60000)
  })

  test('returns undefined (browser-session cookie) when unset or invalid', () => {
    assert.equal(parseSessionMaxAge(undefined), undefined)
    assert.equal(parseSessionMaxAge(''), undefined)
    assert.equal(parseSessionMaxAge('abc'), undefined)
  })
})
