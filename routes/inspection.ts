import { Router } from 'express'
import createError from 'http-errors'
import {
  decodeIdToken,
  fetchPublicKeys,
  requestTokens,
  requestUserInfo,
  yahooEndpoints,
} from '../lib/yahoo.ts'

const router = Router()

// Page that is specified as a redirect destination by Authorization endpoint.
// Will set the result of login in the session and redirect to mypage.
router.get('/', async (req, res, next) => {

  console.log('inspection access')
  console.table(req.session)

  // Check sent state is appropriate for this user.
  const { code, state } = req.query
  if (typeof code !== 'string' || typeof state !== 'string' || state !== req.session.state) {
    console.error('Invalid code or invalid state.')
    next(createError(404))
    return
  }

  const endpoints = yahooEndpoints()

  try {
    // Request tokens.
    const tokens = await requestTokens(endpoints, {
      clientId: process.env.YAHOO_CLIENT_ID ?? '',
      clientSecret: process.env.YAHOO_CLIENT_SECRET ?? '',
      code,
      redirectUri: `${req.protocol}://${req.get('host')}/inspection`,
    })
    console.info('Requested tokens.')

    // https://developer.yahoo.co.jp/yconnect/v2/id_token.html
    // If fails from 6 to 11, ID Token might be altered.
    // If fails from 12 to 14, the authentication has expired.
    // ID Token check:  1. Store nonce value.
    // Already stored in the session.

    // ID Token check:  2. Divide ID Token into 3 parts.
    // ID Token check:  3. Decode them.
    const { header } = decodeIdToken(tokens.id_token)

    // ID Token check:  4. Get Public Key.
    // The key is kept for check 6, which is not implemented yet.
    const publicKeys = await fetchPublicKeys(endpoints)
    const _publicKey = publicKeys[header.kid]

    // ID Token check:  5. Get algorithm.
    // Stored in header.alg

    // Request userInfo using access_token.
    const userInfo = await requestUserInfo(endpoints, tokens.access_token)
    console.info('Requested UserInfo.')

    // ID Token check:  6. Check signature.
    // ID Token check:  7. Check Payload.iss.
    // ID Token check:  8. Check Payload.aud.
    // ID Token check:  9. Check nonce.
    // ID Token check: 10. Check Payload.at_hash.
    // ID Token check: 11. Check Payload.c_hash.
    // ID Token check: 12. Check Payload.exp.
    // ID Token check: 13. Check Payload.iat.
    // ID Token check: 14. Check Payload.auth_time.

    // Regenerate session.
    req.session.regenerate((err: unknown) => {
      console.info('Regenerated session')

      if (err) {
        console.error(err)
        next(createError(404, err instanceof Error ? err.message : 'Failed to regenerate session.'))
        return
      }

      // After coming through the checks, give the user an authenticated flag and user info.
      req.session.isAuthenticatedUser = true
      req.session.userInfo = userInfo
      res.redirect('/mypage')
    })
  } catch (err) {
    console.error(err)
    next(createError(404))
  }
})

export default router
