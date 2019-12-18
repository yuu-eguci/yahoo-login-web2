const express = require('express')
const router = express.Router()
const requestPromise = require('request-promise')
const createError = require('http-errors')


// Page that is specified as a redirect destination by Authorization endpoint.
// Will set the result of login in the session and redirect to mypage.
router.get('/', function(req, res, next) {

  console.log('inspection access')
  console.table(req.session)

  // Check sent state is appropriate for this user.
  if ('code' in req.query && 'state' in req.query && req.query.state == req.session.state) {
    // OK
  } else {
    console.error('Invalid code or invalid state.')
    next(createError(404))
    return
  }

  // Request tokens.
  // https://auth.login.yahoo.co.jp/yconnect/v2/token
  requestPromise({
    url: 'https://auth.login.yahoo.co.jp/yconnect/v2/token',
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`).toString('base64'),
    },
    form: {
      grant_type: 'authorization_code',
      redirect_uri: `${req.protocol}://${req.get('host')}/inspection`,
      code: req.query.code,
    },
    json: true,
  })
  .then((body) => {
    console.info('Requested tokens.')

    // Failed to request tokens.
    if (body.error) {
      console.error('Failed to request tokens.')
      console.table(body)
      next(createError(404))
      return
    }

    // Check id_token later.
    const idToken = body.id_token

    // https://developer.yahoo.co.jp/yconnect/v2/id_token.html
    // If fails from 6 to 11, ID Token might be altered.
    // If fails from 12 to 14, the authentication has expired.
    // ID Token check:  1. Store nonce value.
    // Already stored in the session.

    // ID Token check:  2. Divide ID Token into 3 parts.
    // ID Token check:  3. Decode them.
    const _ = idToken.split('.')
    const header = JSON.parse(Buffer.from(_[0], 'base64').toString())
    const payload = JSON.parse(Buffer.from(_[1], 'base64').toString())
    const signature = Buffer.from(_[2], 'base64').toString()

    // FIXME: Know that it's so ridiculous to store the value in the session in order to pass it to next THEN.
    // But this time the way is adopted because
    // 1. Donno how to do that using request-promise.
    // 2. This repository is a prototype and it will be rewritten using async and await next time.
    req.session._access_token = body.access_token
    req.session._header = header
    req.session._payload = payload
    req.session._signature = signature

    // ID Token check:  4. Get Publick Key.
    return requestPromise({
      url: 'https://auth.login.yahoo.co.jp/yconnect/v2/public-keys',
      json: true,
    })
  })
  .then((body) => {
    const publicKey = body[req.session._header.kid]

    // Request userInfo using access_token.
    return requestPromise({
      url: 'https://userinfo.yahooapis.jp/yconnect/v2/attribute',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + req.session._access_token,
      },
      json: true,
    })
  })
  .then((body) => {
    console.info('Requested UserInfo.')

    // Failed to request userinfo.
    if (body.error) {
      console.error('Failed to request userinfo.')
      console.table(body)
      next(createError(404))
      return
    }

    // Will store it after session regeneration.
    const userInfo = body

    // ID Token check:  5. Get algorism.
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
    req.session.regenerate((err) => {
      console.info('Regenerated session')

      if (err) {
        console.error(err)
        next(createError(404, err))
        return
      }

      // After coming through the checks, give the user an authenticated flag and access_token.
      req.session.isAuthenticatedUser = true
      req.session.userInfo = userInfo
      res.redirect('/mypage')
    })
  })
  .catch((err) => {
    console.error(err)
    next(createError(404))
    return
  })
})

module.exports = router
