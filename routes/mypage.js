var express = require('express');
var router = express.Router();
var createError = require('http-errors');

// Page that the user reaches after login process.
// Only when he is authenticated, displays the page.
router.get('/', function(req, res, next) {

  console.info('mypage access')
  console.table(req.session);

  // Check if the user is authenticated.
  if (req.session.isAuthenticatedUser) {
    // OK
  } else {
    next(createError(404, 'User is not authenticated. <a href="/">Try to login again.</a>'));
    return;
  }

  res.render('./mypage.ejs', {
    userEmail: req.session.userInfo.email,
  })
});

module.exports = router;
