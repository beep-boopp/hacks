// backend/src/routes/did.ts
import { Router, Request, Response } from 'express'
import { getAgent } from '../agent'

const router = Router()

// Create an issuer DID (on Sepolia by default)
router.post('/issuer', async (req: Request, res: Response) => {
  try {
    const agent = await getAgent()

    // create a new did:ethr:sepolia DID and return it
    const created = await agent.didManagerCreate({
      provider: 'did:ethr:sepolia'
    })

    // created will contain DID record + keys metadata
    return res.json({
      ok: true,
      message: 'Issuer DID created',
      did: created
    })
  } catch (err) {
    console.error('Error /did/issuer:', err)
    return res.status(500).json({ ok: false, error: (err as any).message || err })
  }
})

// Optional: list DIDs stored in the DB (useful for quick inspection)
router.get('/list', async (_req: Request, res: Response) => {
  try {
    const agent = await getAgent()
    const all = await agent.dataStoreORMGetIdentifiers()
    return res.json({ ok: true, count: all.length, items: all })
  } catch (err) {
    console.error('Error /did/list:', err)
    return res.status(500).json({ ok: false, error: (err as any).message || err })
  }
})

export default router
