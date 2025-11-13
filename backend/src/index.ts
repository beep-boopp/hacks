// backend/src/index.ts
import vcRoutes from './routes/vc'
import express from 'express'
import didRoutes from './routes/did'
import { getAgent } from './agent'
import vpRouter from './routes/vp'


async function main() {
  // initialize agent first (ensures DB+migrations etc run)
  await getAgent()

  const app = express()
  app.use(express.json())

  app.use('/did', didRoutes)
  app.use('/vc', vcRoutes)
  app.use('/vp', vpRouter)

  


  app.listen(3000, () => {
    console.log('Backend running on http://localhost:3000')
    console.log('Endpoints: POST /did/issuer   GET /did/list')
  })
}

main().catch((err) => {
  console.error('Startup error:', err)
  process.exit(1)
})
