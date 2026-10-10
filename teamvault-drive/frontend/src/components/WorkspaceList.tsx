import { useState, useEffect, useCallback } from 'react'
import { GetWorkspaces } from '../../wailsjs/go/main/App'
import type { main } from '../../wailsjs/go/models'
type WorkspaceInfo = main.WorkspaceInfo
import WorkspaceCard from './WorkspaceCard'

function isAuthError(msg: string) {
  return msg.includes('session expired') || msg.includes('log in') || msg.includes('401') || msg.includes('access token')
}

interface Props {
  onSessionExpired: () => void
}

export default function WorkspaceList({ onSessionExpired }: Props) {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const ws = await GetWorkspaces()
      setWorkspaces(ws || [])
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="splash"><div className="spinner" /></div>

  if (error) {
    const authExpired = isAuthError(error)
    return (
      <div className="empty-state">
        <p style={{ color: 'var(--error)', marginBottom: 12 }}>
          {authExpired ? 'Your session has expired. Please sign in again.' : error}
        </p>
        {authExpired
          ? <button className="btn btn-primary btn-sm" onClick={onSessionExpired}>Sign in again</button>
          : <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
        }
      </div>
    )
  }

  return (
    <div>
      <div className="list-header">
        <h2>Workspaces</h2>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {workspaces.length === 0 ? (
        <div className="empty-state">No workspaces found.</div>
      ) : (
        <div className="workspace-list">
          {workspaces.map(ws => (
            <WorkspaceCard key={ws.id} workspace={ws} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  )
}
