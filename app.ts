import path from 'node:path'
import express, { type ErrorRequestHandler } from 'express'
import session from 'express-session'
import createError from 'http-errors'
import logger from 'morgan'
import { parseSessionMaxAge } from './lib/session.ts'
import indexRouter from './routes/index.ts'
import inspectionRouter from './routes/inspection.ts'
import logoutRouter from './routes/logout.ts'
import mypageRouter from './routes/mypage.ts'
import testRouter from './routes/test.ts'

const app = express()

// view engine setup
app.set('views', path.join(import.meta.dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(import.meta.dirname, 'public')))
// NOTE: Added to get 'https' with req.protocol.
app.enable('trust proxy')
app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: parseSessionMaxAge(process.env.SESSION_MAX_AGE_MS),
  },
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}))

app.use('/', indexRouter)
app.use('/inspection', inspectionRouter)
app.use('/mypage', mypageRouter)
app.use('/logout', logoutRouter)
app.use('/test', testRouter)

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
const errorHandler: ErrorRequestHandler = (err: createError.HttpError, req, res, _next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
}
app.use(errorHandler)

export default app
