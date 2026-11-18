// Runs the mock Yahoo endpoints as a standalone server (used by compose.mock.yaml).
import { createMockYahooServer } from './mock-yahoo.ts'

const port = Number(process.env.PORT ?? '4000')
const { server } = createMockYahooServer()

server.on('request', (req) => {
  console.log(`mock-yahoo: ${req.method} ${req.url}`)
})
server.listen(port, '0.0.0.0', () => {
  console.log(`mock-yahoo: listening on port ${port}`)
})

const shutdown = () => server.close(() => process.exit(0))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
