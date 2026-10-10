import { useState, useEffect, useRef } from 'react'
import { GetConfig, SaveSettings, GetWorkspaces, GetTvIgnore, SaveTvIgnore, GetSyncLog, ClearSyncLog } from '../../wailsjs/go/main/App'
import type { main } from '../../wailsjs/go/models'
type WorkspaceInfo = main.WorkspaceInfo
type LogEntry = main.LogEntry

interface Props {
  onClose: () => void
}

type Tab = 'connection' | 'ignore' | 'log'

export default function Settings({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('log')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal settings-modal">
        <div className="settings-tabs">
          <button
            className={`settings-tab ${tab === 'connection' ? 'active' : ''}`}
            onClick={() => setTab('connection')}
          >
            Connection
          </button>
          <button
            className={`settings-tab ${tab === 'ignore' ? 'active' : ''}`}
            onClick={() => setTab('ignore')}
          >
            Ignore Rules
          </button>
          <button
            className={`settings-tab ${tab === 'log' ? 'active' : ''}`}
            onClick={() => setTab('log')}
          >
            Sync Log
          </button>
        </div>

        {tab === 'connection' && <ConnectionTab onClose={onClose} />}
        {tab === 'ignore'     && <IgnoreTab onClose={onClose} />}
        {tab === 'log'        && <LogTab onClose={onClose} />}
      </div>
    </div>
  )
}

// ── Connection tab ────────────────────────────────────────────────────────────

function ConnectionTab({ onClose }: { onClose: () => void }) {
  const [apiUrl, setApiUrl] = useState('')
  const [domain, setDomain] = useState('')
  const [clientId, setClientId] = useState('')
  const [audience, setAudience] = useState('')
  const [minimizeToTray, setMinimizeToTray] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    GetConfig().then(cfg => {
      if (!cfg) return
      setApiUrl((cfg as any).apiUrl || '')
      setDomain((cfg as any).auth0Domain || '')
      setClientId((cfg as any).auth0ClientId || '')
      setAudience((cfg as any).auth0Audience || '')
      setMinimizeToTray(!!(cfg as any).minimizeToTray)
    }).catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      await SaveSettings(apiUrl, domain, clientId, audience, minimizeToTray)
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    } catch (e: any) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="form-group">
        <label>API URL</label>
        <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://teamvault.cloud" />
      </div>
      <div className="form-group">
        <label>Auth0 Domain</label>
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="login.teamvault.cloud" />
      </div>
      <div className="form-group">
        <label>Auth0 Client ID</label>
        <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Your Native app Client ID" />
      </div>
      <div className="form-group">
        <label>Auth0 Audience</label>
        <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="https://api.teamvault.cloud" />
      </div>
      <div className="form-group">
        <label className="conn-checkbox-label">
          <input
            type="checkbox"
            checked={minimizeToTray}
            onChange={e => setMinimizeToTray(e.target.checked)}
          />
          Minimize to system tray
        </label>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </>
  )
}

// ── Sync Log tab ──────────────────────────────────────────────────────────────

function LogTab({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  function load() {
    setLoading(true)
    GetSyncLog()
      .then(log => setEntries(log ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  async function clear() {
    await ClearSyncLog().catch(() => {})
    setEntries([])
  }

  function isError(msg: string) {
    return msg.startsWith('ERROR:') || msg.toLowerCase().includes('warning')
  }

  return (
    <>
      <div className="log-viewer">
        {loading && <div className="log-empty">Loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="log-empty">No log entries yet. Run a sync to see activity here.</div>
        )}
        {!loading && entries.map((e, i) => (
          <div key={i} className={`log-line ${isError(e.message) ? 'log-line-error' : ''}`}>
            <span className="log-time">{e.time}</span>
            <span className="log-msg">{e.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
        <button className="btn btn-ghost btn-sm" onClick={clear}>Clear</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>
    </>
  )
}

// ── Ignore Rules tab ──────────────────────────────────────────────────────────

const PLACEHOLDER = `# .tvignore — one pattern per line, gitignore-style
# Wildcards:  *  matches within one folder level
#             ** matches across folder levels
# Prefix !   to re-include a previously ignored path
# Suffix /   to match directories only
#
# Examples:
# *.tmp
# *.log
# build/
# node_modules
# docs/drafts/
# **/.DS_Store
`

function IgnoreTab({ onClose }: { onClose: () => void }) {
  const [workspaces, setWorkspaces]         = useState<WorkspaceInfo[]>([])
  const [selectedId, setSelectedId]         = useState('')
  const [content, setContent]               = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading]               = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [error, setError]                   = useState('')

  // Load workspaces that have a local folder configured.
  useEffect(() => {
    GetWorkspaces().then(ws => {
      const configured = (ws ?? []).filter(w => w.localPath)
      setWorkspaces(configured)
      if (configured.length > 0) setSelectedId(configured[0].id)
    }).catch(() => {})
  }, [])

  // Load .tvignore whenever the selected workspace changes.
  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setError('')
    GetTvIgnore(selectedId)
      .then(text => { setContent(text ?? ''); setOriginalContent(text ?? '') })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [selectedId])

  const dirty = content !== originalContent

  async function save() {
    if (!selectedId) return
    setSaving(true)
    setError('')
    try {
      await SaveTvIgnore(selectedId, content)
      setOriginalContent(content)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (e: any) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  if (workspaces.length === 0) {
    return (
      <div className="ignore-empty">
        No workspaces have a local folder configured yet.<br />
        Choose a sync folder from the main screen first.
      </div>
    )
  }

  return (
    <>
      {workspaces.length > 1 && (
        <div className="form-group">
          <label>Workspace</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="settings-select"
          >
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>
      )}

      {workspaces.length === 1 && (
        <p className="ignore-ws-label">
          Editing <strong>{workspaces[0].name}</strong>
          <span className="ignore-path">{workspaces[0].localPath}/.tvignore</span>
        </p>
      )}

      {error && <div className="ignore-error">{error}</div>}

      <div className="form-group">
        <textarea
          className="ignore-editor"
          value={loading ? '' : content}
          onChange={e => setContent(e.target.value)}
          placeholder={loading ? 'Loading…' : PLACEHOLDER}
          disabled={loading || saving}
          spellCheck={false}
          rows={12}
        />
      </div>

      <div className="modal-footer">
        <span className="ignore-hint">
          Changes take effect on the next sync
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { setContent(''); }}
          disabled={saving || loading}
          title="Clear all patterns"
        >
          Clear
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { setContent(originalContent); setSaved(false); onClose() }}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={saving || loading || !dirty}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </>
  )
}
