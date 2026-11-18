import { Router } from 'express'
import { fetchOpenIdConfiguration, yahooEndpoints } from '../lib/yahoo.ts'

const router = Router()

// Checks that the Yahoo discovery document can be fetched twice in a row.
router.get('/', async (req, res) => {

  console.log('test access')
  console.table(req.session)

  const endpoints = yahooEndpoints()
  let result = ''

  try {
    // First access.
    await fetchOpenIdConfiguration(endpoints)
    result += 'First OK '

    // Second access.
    await fetchOpenIdConfiguration(endpoints)
    result += 'Second OK '
  } catch (error) {
    console.error(error)
    result = 'NG'
  }

  res.render('./test.ejs', {
    result,
  })
})

export default router
