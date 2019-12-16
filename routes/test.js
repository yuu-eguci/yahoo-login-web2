const express = require('express')
const router = express.Router()
const requestPromise = require('request-promise')

/* GET home page. */
router.get('/', function(req, res, next) {

  console.log('test access')
  console.table(req.session)

  var result = ''

  // First access.
  requestPromise({
    url: 'https://auth.login.yahoo.co.jp/yconnect/v2/.well-known/openid-configuration',
    method: 'GET',
    json: true,
  }).then(body => {
    result += 'First OK '

    // Second access.
    return requestPromise({
      url: 'https://auth.login.yahoo.co.jp/yconnect/v2/.well-known/openid-configuration',
      method: 'GET',
      json: true,
    })
  }).then(body => {
    result += 'Second OK '
  }).catch(error => {
    console.table(error)
    result = 'NG'
  }).finally(() => {
    res.render('./test.ejs', {
      result,
    })
  })
})

module.exports = router
