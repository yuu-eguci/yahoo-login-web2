// End-to-end check of a running app that is wired to the mock Yahoo endpoints (see compose.mock.yaml).
// Usage: node test/smoke/mocked-login.ts [app origin]   (default: http://app:3000)
import assert from 'node:assert/strict'
import { createClient } from '../support/http-client.ts'
import { fixtures } from '../support/mock-yahoo.ts'

const origin = process.argv[2] ?? process.env.APP_URL ?? 'http://app:3000'
const client = createClient(origin)

const step = async (name: string, check: () => Promise<void>): Promise<void> => {
  await check()
  console.log(`ok - ${name}`)
}

let state = ''

await step('top page shows the login button settings', async () => {
  const res = await client.request('/')
  const html = await res.text()
  assert.equal(res.status, 200)
  assert.match(html, new RegExp(`clientId: '${fixtures.clientId}'`))
  assert.match(html, new RegExp(`redirectUri: '${origin}/inspection'`))
  state = /state: '([^']*)'/.exec(html)?.[1] ?? ''
  assert.notEqual(state, '')
})

await step('mypage is hidden before login', async () => {
  assert.equal((await client.request('/mypage')).status, 404)
})

await step('callback with a forged state is rejected', async () => {
  assert.equal((await client.request(`/inspection?code=${fixtures.code}&state=forged`)).status, 404)
})

await step('callback exchanges the code and redirects to mypage', async () => {
  const res = await client.request(`/inspection?code=${fixtures.code}&state=${encodeURIComponent(state)}`)
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('location'), '/mypage')
})

await step('mypage greets the logged-in user', async () => {
  const res = await client.request('/mypage')
  assert.equal(res.status, 200)
  assert.match(await res.text(), new RegExp(`Hi ${fixtures.email}!`))
})

await step('test page reaches the discovery document twice', async () => {
  assert.match(await (await client.request('/test')).text(), /First OK Second OK/)
})

await step('logout ends the session', async () => {
  const res = await client.request('/logout')
  assert.equal(res.status, 200)
  assert.match(await res.text(), /Logged out/)
  assert.equal((await client.request('/mypage')).status, 404)
})

console.log('mocked login flow: all checks passed')
