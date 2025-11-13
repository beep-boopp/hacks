import { Router } from 'express'
import { getAgent } from '../agent'

const router = Router()

// ------------------------------------------------------
// 1) POST /vp/request
// Verifier requests specific claims (SDR)
// ------------------------------------------------------
router.post('/request', async (req, res) => {
  try {
    const { requested } = req.body
    if (!requested || !Array.isArray(requested)) {
      return res.status(400).json({
        ok: false,
        error: "Field 'requested' must be an array"
      })
    }

    const sdr = {
      id: Date.now().toString(),
      requested
    }

    return res.json({
      ok: true,
      message: "Selective Disclosure Request (SDR) created",
      sdr
    })
  } catch (err: any) {
    console.error("SDR Request error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
})


// ------------------------------------------------------
// 2) POST /vp/present
// Citizen provides VC + requested fields -> Build VP
// ------------------------------------------------------
router.post('/present', async (req, res) => {
  try {
    const { jwt, requested } = req.body

    if (!jwt || !requested) {
      return res.status(400).json({
        ok: false,
        error: "Fields 'jwt' and 'requested' required"
      })
    }

    const agent = await getAgent()

    // Decode VC but don’t verify yet
    const decoded = await agent.decodeJWT({ jwt })

    const fullClaims = decoded?.payload?.vc?.credentialSubject || {}

    // Extract only requested fields
    const selectiveClaims: any = {}
    for (const key of requested) {
      if (fullClaims[key] !== undefined) {
        selectiveClaims[key] = fullClaims[key]
      }
    }

    // Build Verifiable Presentation
    const vp = await agent.createVerifiablePresentation({
      presentation: {
        holder: decoded.payload.sub,
        verifier: ["did:example:verifier"], // placeholder verifier DID
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        verifiableCredential: [jwt],
        credentialSubject: selectiveClaims
      },
      proofFormat: 'jwt'
    })

    return res.json({
      ok: true,
      message: "Selective Presentation created",
      vp,
      sharedClaims: selectiveClaims
    })

  } catch (err: any) {
    console.error("VP Present error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
})


// ------------------------------------------------------
// 3) POST /vp/verify
// Verifier verifies VP & extracts selective claims
// ------------------------------------------------------
router.post('/verify', async (req, res) => {
  try {
    const { vp } = req.body

    if (!vp) {
      return res.status(400).json({
        ok: false,
        error: "Field 'vp' required"
      })
    }

    const agent = await getAgent()

    // Verify the VP JWT
    const result = await agent.verifyPresentation({
      presentation: vp,
      challenge: undefined, // no challenge for demo
      domain: undefined
    })

    // Extract disclosed claims
    const decoded = await agent.decodeJWT({ jwt: vp })
    const claims = decoded?.payload?.vp?.credentialSubject || {}

    return res.json({
      ok: true,
      message: "Verifiable Presentation verified",
      verified: result.verified,
      claims
    })

  } catch (err: any) {
    console.error("VP Verify error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
})


export default router
