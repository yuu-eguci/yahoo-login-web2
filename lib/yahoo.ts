// Yahoo! ID 連携 v2 endpoints and the response shapes this app relies on.
// https://developer.yahoo.co.jp/yconnect/v2/

const DEFAULT_AUTH_ORIGIN = 'https://auth.login.yahoo.co.jp'
const DEFAULT_USERINFO_ORIGIN = 'https://userinfo.yahooapis.jp'

export interface YahooEndpoints {
  token: string
  publicKeys: string
  openIdConfiguration: string
  userInfo: string
}

// Origins can be overridden (e.g. with a local mock for tests); the defaults are the real Yahoo services.
export const yahooEndpoints = (env: NodeJS.ProcessEnv = process.env): YahooEndpoints => {
  const auth = (env.YAHOO_AUTH_ORIGIN || DEFAULT_AUTH_ORIGIN).replace(/\/+$/, '')
  const userInfo = (env.YAHOO_USERINFO_ORIGIN || DEFAULT_USERINFO_ORIGIN).replace(/\/+$/, '')
  return {
    token: `${auth}/yconnect/v2/token`,
    publicKeys: `${auth}/yconnect/v2/public-keys`,
    openIdConfiguration: `${auth}/yconnect/v2/.well-known/openid-configuration`,
    userInfo: `${userInfo}/yconnect/v2/attribute`,
  }
}

// https://developer.yahoo.co.jp/yconnect/v2/authorization_code/token.html
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  id_token: string
}

// https://developer.yahoo.co.jp/yconnect/v2/id_token.html
export interface IdTokenHeader {
  typ?: string
  alg: string
  kid: string
}

export interface IdTokenPayload {
  iss?: string
  sub?: string
  aud?: string[]
  nonce?: string
  at_hash?: string
  c_hash?: string
  exp?: number
  iat?: number
  auth_time?: number
}

export interface DecodedIdToken {
  header: IdTokenHeader
  payload: IdTokenPayload
  signature: string
}

// Public keys keyed by `kid`, in PEM format.
export type PublicKeys = Record<string, string>

// https://developer.yahoo.co.jp/yconnect/v2/userinfo.html
export interface UserInfo {
  sub: string
  email?: string
  email_verified?: boolean
  [claim: string]: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Fetches JSON and treats both non-2xx statuses and `error` bodies as failures.
const fetchJson = async (url: string, init?: RequestInit): Promise<Record<string, unknown>> => {
  const res = await fetch(url, init)
  const body: unknown = await res.json()
  if (!res.ok || !isRecord(body) || 'error' in body) {
    throw new YahooApiError(url, res.status, body)
  }
  return body
}

export class YahooApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(url: string, status: number, body: unknown) {
    super(`Yahoo API request failed: ${new URL(url).pathname} (HTTP ${status})`)
    this.name = 'YahooApiError'
    this.status = status
    this.body = body
  }
}

export interface TokenRequest {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}

export const requestTokens = async (
  endpoints: YahooEndpoints,
  { clientId, clientSecret, code, redirectUri }: TokenRequest,
): Promise<TokenResponse> => {
  const body = await fetchJson(endpoints.token, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  })
  if (typeof body.access_token !== 'string' || typeof body.id_token !== 'string') {
    throw new YahooApiError(endpoints.token, 200, body)
  }
  return body as unknown as TokenResponse
}

export const fetchPublicKeys = async (endpoints: YahooEndpoints): Promise<PublicKeys> => {
  const body = await fetchJson(endpoints.publicKeys)
  return Object.fromEntries(
    Object.entries(body).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

export const requestUserInfo = async (
  endpoints: YahooEndpoints,
  accessToken: string,
): Promise<UserInfo> => {
  const body = await fetchJson(endpoints.userInfo, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (typeof body.sub !== 'string') {
    throw new YahooApiError(endpoints.userInfo, 200, body)
  }
  return body as UserInfo
}

export const fetchOpenIdConfiguration = async (
  endpoints: YahooEndpoints,
): Promise<Record<string, unknown>> => fetchJson(endpoints.openIdConfiguration)

const decodePart = (part: string | undefined): Record<string, unknown> => {
  const value: unknown = JSON.parse(Buffer.from(part ?? '', 'base64url').toString())
  if (!isRecord(value)) {
    throw new TypeError('ID Token part is not a JSON object.')
  }
  return value
}

// Splits an ID Token into its 3 parts and decodes them. The signature is NOT verified here.
export const decodeIdToken = (idToken: string): DecodedIdToken => {
  const parts = idToken.split('.')
  if (parts.length !== 3) {
    throw new TypeError('ID Token must consist of 3 parts.')
  }
  const header = decodePart(parts[0])
  if (typeof header.alg !== 'string' || typeof header.kid !== 'string') {
    throw new TypeError('ID Token header must have alg and kid.')
  }
  return {
    header: header as unknown as IdTokenHeader,
    payload: decodePart(parts[1]) as IdTokenPayload,
    signature: Buffer.from(parts[2] ?? '', 'base64url').toString(),
  }
}
