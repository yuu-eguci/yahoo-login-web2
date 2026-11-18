import { Router } from 'express'

const router = Router()

// Page that removes session and displays logout page.
router.get('/', (req, res) => {

  console.info('logout access')
  console.table(req.session)

  req.session.destroy(() => {
    res.render('./logout.ejs')
  })
})

export default router
