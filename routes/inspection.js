var express = require('express')
var router = express.Router()
var request = require('request')
var createError = require('http-errors')


// Page that is specified as a redirect destination by Authorization endpoint.
// Will set the result of login in the session and redirect to mypage.
router.get('/', function(req, res, next) {

  console.log('inspection access')
  console.table(req.session)

  // Check sent state is appropriate for this user.
  if ('code' in req.query && 'state' in req.query && req.query.state == req.session.state) {
    // OK
  } else {
    next(createError(404, 'Invalid code or invalid state.'))
    return
  }

  // https://auth.login.yahoo.co.jp/yconnect/v2/token
  // HACK: Must resolve nested code.
  request.post({
    url: 'https://auth.login.yahoo.co.jp/yconnect/v2/token',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`).toString('base64'),
    },
    form: {
      grant_type: 'authorization_code',
      redirect_uri: `${req.protocol}://${req.get('host')}/inspection`,
      code: req.query.code,
    },
    json: true,
  }, (error, response, body) => {

    // Error handling.
    if (body.error) {
      console.error('Failed to request access_token.')
      console.table(body)
      next(createError(404, 'Invalid code.'))
      return
    }

    // Check id_token later.
    const idToken = body.id_token

    // Request userInfo using access_token.
    request.get({
      url: 'https://userinfo.yahooapis.jp/yconnect/v2/attribute',
      headers: {
        'Authorization': 'Bearer ' + body.access_token,
      },
      json: true,
    }, (error, response, body) => {
      console.info('Requested UserInfoApi endpoint')

      // Store userInfo in the session.
      // セッション再生成後に格納します。
      // Will store it after session regeneration.
      const userInfo = body

      // https://developer.yahoo.co.jp/yconnect/v2/id_token.html
      // If fails from 6 to 11, ID Token might be altered.
      // If fails from 12 to 14, the authentication has expired.
      // ID Token check:  1. Store nonce value.
      // ID Token check:  2. Divide ID Token into 3 parts.
      // ID Token check:  3. Decode them.
      // ID Token check:  4. Get Publick Key.
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
      console.info('Regenerate session')
      req.session.regenerate((err) => {
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
  })
})

module.exports = router
