const express = require('express')
const router = express.Router()

/* GET home page. */
router.get('/', function(req, res, next) {

  console.log('index access')
  console.table(req.session)

  // Generate state and nonce.
  // TODO: Must be random strings for prod.
  const state = 'statestatestatestate'
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
