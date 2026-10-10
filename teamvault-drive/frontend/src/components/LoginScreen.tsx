import { useState, useEffect } from 'react'
import { Login, GetConfig } from '../../wailsjs/go/main/App'
import Settings from './Settings'

interface Props {
  onLogin: () => void
}

export default function LoginScreen({ onLogin }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [needsConfig, setNeedsConfig] = useState(false)

  useEffect(() => {
    GetConfig().then(cfg => {
      if (!cfg?.auth0ClientId) {
        setNeedsConfig(true)
        setShowSettings(true)
      }
    }).catch(() => {})
  }, [])

  async function handleLogin() {
    setLoading(true)
    setError('')
    try {
      await Login()
      onLogin()
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      {showSettings && (
        <Settings onClose={() => {
          setShowSettings(false)
          setNeedsConfig(false)
        }} />
      )}
      <div style={{ fontSize: 52 }}>🔐</div>
      <h1>TeamVault Drive</h1>
      <p>Sync your TeamVault workspace files to your desktop securely.</p>
      {needsConfig && (
        <p className="login-error" style={{ marginBottom: 8 }}>
          Configure your Auth0 settings before signing in.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Opening browser...' : 'Sign in with TeamVault'}
        </button>
        <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
          Settings
        </button>
      </div>
      {error && <p className="login-error">{error}</p>}
    </div>
  )
}
