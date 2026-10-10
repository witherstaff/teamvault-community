import { useState, useEffect } from 'react'
import { IsLoggedIn } from '../wailsjs/go/main/App'
import LoginScreen from './components/LoginScreen'
import MainApp from './components/MainApp'
import './App.css'

export default function App() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    IsLoggedIn().then(setLoggedIn).catch(() => setLoggedIn(false))
  }, [])

  if (loggedIn === null) {
    return (
      <div className="splash">
        <div className="spinner" />
      </div>
    )
  }

  return loggedIn
    ? <MainApp onLogout={() => setLoggedIn(false)} onSessionExpired={() => setLoggedIn(false)} />
    : <LoginScreen onLogin={() => setLoggedIn(true)} />
}
