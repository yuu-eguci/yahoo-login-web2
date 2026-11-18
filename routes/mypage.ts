import { Router } from 'express'
import createError from 'http-errors'

const router = Router()

// Page that the user reaches after login process.
// Only when he is authenticated, displays the page.
router.get('/', (req, res, next) => {

  console.info('mypage access')
  console.table(req.session)

  // Check if the user is authenticated.
  if (!req.session.isAuthenticatedUser) {
    next(createError(404, 'User is not authenticated.'))
    return
  }

  res.render('./mypage.ejs', {
    userEmail: req.session.userInfo?.email,
  })
})

export default router
