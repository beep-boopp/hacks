import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserProvider } from 'ethers'

type Nullable<T> = T | null

interface AuthState {
  account: Nullable<string>
  token: Nullable<string>
  loading: boolean
  error: Nullable<string>
}

interface UseMetamaskAuth {
  account: Nullable<string>
  token: Nullable<string>
  loading: boolean
  error: Nullable<string>
  connect: () => Promise<void>
  disconnect: () => void
  resetError: () => void
}

const API_BASE = (import.meta.env?.VITE_API_URL as string) ?? 'http://localhost:3000'
const MESSAGE_PREFIX = 'PixelGenesis login nonce: '

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<any>
      on: (event: string, handler: (...args: any[]) => void) => void
      removeListener: (event: string, handler: (...args: any[]) => void) => void
    }
  }
}

async function fetchNonce(address: string) {
  const response = await fetch(`${API_BASE}/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  })

  const data = await response.json()
  if (!response.ok || !data.nonce) {
    throw new Error(data.error || 'Failed to obtain nonce')
  }

  return data.nonce as string
}

async function verifySignature(address: string, signature: string) {
  const response = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature })
  })

  const data = await response.json()
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Signature verification failed')
  }

  return data.token as Nullable<string>
}

export function useMetamaskAuth(): UseMetamaskAuth {
  const [state, setState] = useState<AuthState>({
    account: null,
    token: null,
    loading: false,
    error: null
  })

  const mountedRef = useRef(true)

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const disconnect = useCallback(() => {
    setState({
      account: null,
      token: null,
      loading: false,
      error: null
    })
  }, [])

  const connect = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      if (!window.ethereum) {
        throw new Error('MetaMask extension not detected')
      }

      // Ask MetaMask for accounts (triggers popup if locked)
      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      const address = accounts[0]
      if (!address) {
        throw new Error('No account returned by MetaMask')
      }

      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      // 1. Fetch login nonce from backend
      const nonce = await fetchNonce(address)

      // 2. Ask MetaMask to sign human-readable message (EIP-4361 style optional)
      const signature = await signer.signMessage(`${MESSAGE_PREFIX}${nonce}`)

      // 3. Verify signature with backend → expect session token/JWT
      const token = await verifySignature(address, signature)

      if (!mountedRef.current) return

      setState({
        account: address,
        token,
        loading: false,
        error: null
      })
    } catch (err: any) {
      if (!mountedRef.current) return
      setState({
        account: null,
        token: null,
        loading: false,
        error: err?.message ?? 'Unknown MetaMask error'
      })
    }
  }, [])

  // Auto-disconnect when user switches accounts or chains
  useEffect(() => {
    mountedRef.current = true
    const ethereum = window.ethereum

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts.length) {
        disconnect()
      } else {
        setState((prev) => ({ ...prev, account: accounts[0] }))
      }
    }

    const handleChainChanged = () => {
      // Force fresh state so dApp revalidates network/nonce
      disconnect()
    }

    if (ethereum?.on) {
      ethereum.on('accountsChanged', handleAccountsChanged)
      ethereum.on('chainChanged', handleChainChanged)
    }

    return () => {
      mountedRef.current = false

      if (ethereum?.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged)
        ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [disconnect])


  return {
    account: state.account,
    token: state.token,
    loading: state.loading,
    error: state.error,
    connect,
    disconnect,
    resetError
  }
}