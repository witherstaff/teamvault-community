import { useState } from 'react'
import { Logout } from '../../wailsjs/go/main/App'
import WorkspaceList from './WorkspaceList'
import Settings from './Settings'

interface Props {
  onLogout: () => void
  onSessionExpired: () => void
}

export default function MainApp({ onLogout, onSessionExpired }: Props) {
  const [showSettings, setShowSettings] = useState(false)

  function handleLogout() {
    Logout().finally(onLogout)
  }

  return (
    <div className="main-layout">
      <header className="header">
        <h1>🔒 TeamVault Drive</h1>
        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)}>Settings</button>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <div className="content">
        <WorkspaceList onSessionExpired={onSessionExpired} />
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
