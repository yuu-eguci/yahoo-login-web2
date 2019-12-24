const express = require('express')
const router = express.Router()

// Page that removes session and displays logout page.
router.get('/', function(req, res, next) {

  console.info('logout access')
  console.table(req.session)

  req.session.destroy((err) => {
    res.render('./logout.ejs')
  })
})

module.exports = router
