import express, { Application, RequestHandler } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import globalErrorHandler from './middleware/globalErrorHandler'
import notFound from './middleware/notFound'
import router from './router'

const app: Application = express()

app.use(express.static('public'))

app.use(express.json())
app.use(cookieParser())

const corsOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: false,
};

app.use(cors(corsOptions))

app.use('/api/v1', router)

app.get('/', (req, res) => {
  res.send('Hey there! I am working......')
})

app.use(globalErrorHandler as unknown as RequestHandler)
app.use(notFound as unknown as RequestHandler)

export default app
