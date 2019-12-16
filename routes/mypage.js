const express = require('express')
const router = express.Router()
const createError = require('http-errors')

// Page that the user reaches after login process.
// Only when he is authenticated, displays the page.
router.get('/', function(req, res, next) {

  console.info('mypage access')
  console.table(req.session)

  // Check if the user is authenticated.
  if (req.session.isAuthenticatedUser) {
    // OK
  } else {
    next(createError(404, 'User is not authenticated.'))
    return
  }

  res.render('./mypage.ejs', {
    userEmail: req.session.userInfo.email,
  })
})

module.exports = router
