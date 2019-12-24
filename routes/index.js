const express = require('express')
const router = express.Router()
const crypto = require('crypto')

/* GET home page. */
router.get('/', function(req, res, next) {

  console.log('index access')
  console.table(req.session)

  // Redirect logged in user to the mypage.
  if (req.session.isAuthenticatedUser) {
    res.redirect('/mypage')
    return
  }

  // Generate state and nonce.
  const state = crypto.randomBytes(11).toString('base64').substring(0, 11)
  // TODO: Must generate random value.
  const nonce = 'noncenoncenoncenonce'
  req.session.state = state
  req.session.nonce = nonce

  res.render('./index.ejs', {
    state,
    nonce,
    cliendId: process.env.YAHOO_CLIENT_ID,
    redirectUri: `${req.protocol}://${req.get('host')}/inspection`,
  })
})

module.exports = router
