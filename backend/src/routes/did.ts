// backend/src/routes/did.ts
import { Router } from 'express'
import { getAgent } from '../agent'

const router = Router()

// Create Issuer DID (unchanged)
router.post('/issuer', async (_req, res) => {
  try {
    const agent = await getAgent()

    // create a new did:ethr:sepolia DID and return it (alias 'issuer')
    const created = await agent.didManagerCreate({
      provider: 'did:ethr:sepolia',
      alias: 'issuer',
    })

    return res.json({
      ok: true,
      message: 'Issuer DID created',
      did: created,
    })
  } catch (err) {
    console.error('Error /did/issuer:', err)
    return res.status(500).json({ ok: false, error: (err as any).message || err })
  }
})

// -------------------------------
// NEW: Create Citizen DID
// -------------------------------
// POST /did/citizen
// Optionally accept { alias } in body to tag the DID (helpful for tests)
router.post('/citizen', async (req, res) => {
  try {
    const { alias } = req.body || {}
    const agent = await getAgent()

    const created = await agent.didManagerCreate({
      provider: 'did:ethr:sepolia',
      alias: alias || undefined, // optional friendly label
    })

    return res.json({
      ok: true,
      message: 'Citizen DID created',
      did: created,
    })
  } catch (err) {
    console.error('Error /did/citizen:', err)
    return res.status(500).json({ ok: false, error: (err as any).message || err })
  }
})

// List stored DIDs (useful)
router.get('/list', async (_req, res) => {
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
