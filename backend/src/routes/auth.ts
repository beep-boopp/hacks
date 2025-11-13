import { Router } from 'express'
import { randomBytes } from 'crypto'
import { verifyMessage } from 'ethers'

const router = Router()

// In-memory nonce storage (address -> nonce). Replace with persistent storage for production.
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>()

const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function createNonce() {
  return randomBytes(16).toString('hex')
}

function normalize(address: string) {
  return address.toLowerCase()
}

router.post('/nonce', (req, res) => {
  const { address } = req.body ?? {}

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ ok: false, error: 'address required' })
  }

  const nonce = createNonce()
  nonceStore.set(normalize(address), {
    nonce,
    expiresAt: Date.now() + NONCE_TTL_MS
  })

  return res.json({ ok: true, nonce })
})

router.post('/verify', (req, res) => {
  const { address, signature } = req.body ?? {}

  if (!address || typeof address !== 'string' || !signature || typeof signature !== 'string') {
    return res.status(400).json({ ok: false, error: 'address and signature required' })
  }

  const key = normalize(address)
  const record = nonceStore.get(key)

  if (!record) {
    return res.status(400).json({ ok: false, error: 'nonce not found; request a new one' })
  }

  if (Date.now() > record.expiresAt) {
    nonceStore.delete(key)
    return res.status(400).json({ ok: false, error: 'nonce expired; request a new one' })
  }

  const message = `PixelGenesis login nonce: ${record.nonce}`

  try {
    const recovered = verifyMessage(message, signature)

    if (normalize(recovered) !== key) {
      return res.status(401).json({ ok: false, error: 'signature mismatch' })
    }

    nonceStore.delete(key)

    // TODO: issue a JWT or session token. For now we echo success.
    return res.json({
      ok: true,
      message: 'Wallet verified',
      address: recovered,
      token: null
    })
  } catch (err: any) {
    return res.status(400).json({ ok: false, error: err?.message ?? 'Invalid signature' })
  }
})

export default router

