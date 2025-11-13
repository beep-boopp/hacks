import { Router } from 'express'
import { getAgent } from '../agent'

const router = Router()

// -------------------------------
// Helper: Get or create Issuer DID
// -------------------------------
async function getOrCreateIssuer(agent: any) {
  const all = await agent.dataStoreORMGetIdentifiers()
  const issuer = all.find((id: any) => id.alias === 'issuer')

  if (issuer) return issuer

  const created = await agent.didManagerCreate({
    provider: 'did:ethr:sepolia',
    alias: 'issuer',
  })

  return created
}

// -------------------------------
// POST /vc/issue
// -------------------------------
router.post('/issue', async (req, res) => {
  try {
    const { subjectDid, claims } = req.body

    if (!subjectDid || !claims) {
      return res.status(400).json({
        ok: false,
        error: "Required fields: subjectDid, claims"
      })
    }

    const agent = await getAgent()
    const issuer = await getOrCreateIssuer(agent)

    const vc = await agent.createVerifiableCredential({
      credential: {
        issuer: { id: issuer.did },
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: subjectDid,
          ...claims
        }
      },
      proofFormat: 'jwt'
    })

    return res.json({
      ok: true,
      message: "VC issued successfully",
      issuer: issuer.did,
      vc
    })

  } catch (err: any) {
    console.error("Error issuing VC:", err)
    return res.status(500).json({
      ok: false,
      error: err.message || err
    })
  }
})


// -------------------------------
// POST /vc/verify   <<=== INSERTED HERE
// -------------------------------
router.post('/verify', async (req, res) => {
  try {
    const { jwt } = req.body

    if (!jwt) {
      return res.status(400).json({
        ok: false,
        error: "Missing field: jwt"
      })
    }

    const agent = await getAgent()

    const result = await agent.verifyCredential({
      credential: jwt
    })

    return res.json({
      ok: true,
      message: "VC verification complete",
      verified: result.verified,
      results: result
    })

  } catch (err: any) {
    console.error("Error verifying VC:", err)
    return res.status(500).json({
      ok: false,
      error: err.message || err
    })
  }
})


// DO NOT TOUCH THIS ↓↓↓
export default router
