// backend/src/index.ts
import express from 'express'
import cors from 'cors'

import { getAgent } from './agent'
import didRoutes from './routes/did'
import vcRoutes from './routes/vc'
import vpRouter from './routes/vp'
import authRoutes from './routes/auth'

async function main() {
  // initialize agent first (ensures DB + migrations etc run)
  await getAgent()

  const app = express()

  app.use(express.json())
  app.use(
    cors({
      origin: true,
      credentials: true
    })
  )

  app.use('/did', didRoutes)
  app.use('/vc', vcRoutes)
  app.use('/vp', vpRouter)
  app.use('/auth', authRoutes)

  app.listen(3000, () => {
    console.log('Backend running on http://localhost:3000')
    console.log('Endpoints: POST /did/issuer   GET /did/list')
  })
}

main().catch((err) => {
  console.error('Startup error:', err)
  process.exit(1)
})
