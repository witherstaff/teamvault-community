import { useState, useEffect } from 'react'
import {
  ChooseFolder, SyncNow, StartWatcher, StopWatcher,
  OpenFolder, GetSyncStatus, SetScheduleInterval,
} from '../../wailsjs/go/main/App'
import type { main } from '../../wailsjs/go/models'
type WorkspaceInfo = main.WorkspaceInfo
type SyncStatusInfo = main.SyncStatusInfo
import { EventsOn } from '../../wailsjs/runtime/runtime'
import FolderPicker from './FolderPicker'

interface Props {
  workspace: WorkspaceInfo
  onUpdate: () => void
}

export default function WorkspaceCard({ workspace: ws, onUpdate }: Props) {
  const [status, setStatus] = useState<SyncStatusInfo>({ workspaceId: ws.id, state: 'idle', message: '' })
  const [busy, setBusy] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    GetSyncStatus(ws.id).then(s => { if (s) setStatus(s) }).catch(() => {})

    const off = EventsOn('sync:status', (s: SyncStatusInfo) => {
      if (s?.workspaceId === ws.id) setStatus(s)
    })
    return () => { off() }
  }, [ws.id])

  const usedPct = ws.limitBytes > 0 ? (ws.usedBytes / ws.limitBytes) * 100 : 0
  const GiB = 1024 * 1024 * 1024
  const usedGB = (ws.usedBytes / GiB).toFixed(1)
  const limitGB = (ws.limitBytes / GiB).toFixed(0)
  const fillClass = usedPct > 90 ? 'full' : usedPct > 75 ? 'warn' : ''

  async function chooseFolder() {
    setBusy(true)
    try {
      await ChooseFolder(ws.id)
      onUpdate()
    } catch (e: any) {
      if (e) console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function syncNow() {
    setBusy(true)
    try { await SyncNow(ws.id) } catch (e: any) { console.error(e) }
    finally { setBusy(false) }
  }

  async function toggleWatch() {
    setBusy(true)
    try {
      if (status.state === 'watching') {
        await StopWatcher(ws.id)
      } else {
        await StartWatcher(ws.id)
      }
    } catch (e: any) { console.error(e) }
    finally { setBusy(false) }
  }

  const watching = status.state === 'watching'
  const syncing = status.state === 'syncing'

  async function setSchedule(minutes: number) {
    try { await SetScheduleInterval(ws.id, minutes); onUpdate() }
    catch (e: any) { console.error(e) }
  }

  const scheduleOptions = [
    { label: 'Off',      value: 0 },
    { label: '15 min',   value: 15 },
    { label: '30 min',   value: 30 },
    { label: '1 hour',   value: 60 },
    { label: '2 hours',  value: 120 },
    { label: '4 hours',  value: 240 },
    { label: '8 hours',  value: 480 },
    { label: '24 hours', value: 1440 },
  ]

  return (
    <>
      <div className="ws-card">
        <div className="ws-card-top">
          <span className="ws-name">{ws.name}</span>
          <span className="ws-badge">{ws.role}</span>
        </div>

        <div className="storage-bar">
          <div className={`storage-fill ${fillClass}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
        </div>
        <div className="storage-label">{usedGB} / {limitGB} GB used</div>

        <div className="ws-folder">
          {ws.localPath
            ? <span className="ws-folder-path" title={ws.localPath}>{ws.localPath}</span>
            : <span className="ws-folder-path" style={{ fontStyle: 'italic' }}>No folder configured</span>
          }
          <button className="btn btn-ghost btn-sm" onClick={chooseFolder} disabled={busy}>
            {ws.localPath ? 'Change' : 'Choose Folder'}
          </button>
        </div>

        {ws.localPath && (
          <div className="ws-selective">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPicker(true)}
              disabled={busy || syncing}
            >
              🗂 Select Folders
            </button>
            {ws.excludedFolderCount > 0 && (
              <span className="ws-excluded-badge">
                {ws.excludedFolderCount} excluded
              </span>
            )}
          </div>
        )}

        {ws.localPath && (
          <div className="ws-schedule">
            <span className="ws-schedule-label">Auto-sync</span>
            <select
              className="ws-schedule-select"
              value={ws.scheduleMinutes}
              onChange={e => setSchedule(Number(e.target.value))}
              disabled={syncing}
            >
              {scheduleOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {ws.isScheduled && (
              <span className="ws-scheduled-badge">● scheduled</span>
            )}
          </div>
        )}

        <div className="ws-actions">
          {ws.localPath && (
            <>
              <button className="btn btn-primary btn-sm" onClick={syncNow} disabled={busy || syncing}>
                {syncing ? 'Syncing...' : '↑↓ Sync Now'}
              </button>
              <button
                className={`btn btn-sm ${watching ? 'btn-primary' : 'btn-ghost'}`}
                onClick={toggleWatch}
                disabled={busy || syncing}
              >
                {watching ? '⏸ Stop Watching' : '👁 Watch'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => OpenFolder(ws.id)}>
                📂 Open
              </button>
            </>
          )}
        </div>

        <div className="ws-status">
          <span className={`status-dot ${status.state}`} />
          <span>{status.message || status.state}</span>
        </div>
      </div>

      {showPicker && (
        <FolderPicker
          workspaceId={ws.id}
          workspaceName={ws.name}
          onClose={() => setShowPicker(false)}
          onSaved={onUpdate}
        />
      )}
    </>
  )
}
