import { useState, useEffect } from 'react'
import { GetFolderTree, GetExcludedFolders, SetExcludedFolders } from '../../wailsjs/go/main/App'
import type { main } from '../../wailsjs/go/models'
type FolderNode = main.FolderNode

interface Props {
  workspaceId: string
  workspaceName: string
  onClose: () => void
  onSaved: () => void
}

export default function FolderPicker({ workspaceId, workspaceName, onClose, onSaved }: Props) {
  const [tree, setTree] = useState<FolderNode[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      GetFolderTree(workspaceId),
      GetExcludedFolders(workspaceId),
    ]).then(([nodes, excl]) => {
      setTree(nodes ?? [])
      setExcluded(new Set(excl ?? []))
    }).catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [workspaceId])

  function toggle(path: string, children: FolderNode[]) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        // Re-include this folder and all its descendants.
        next.delete(path)
        removeDescendants(next, path)
      } else {
        // Exclude this folder and all its descendants.
        next.add(path)
        addDescendants(next, children)
        // If all siblings are now excluded, the parent could also be excluded —
        // but we keep that explicit to avoid surprising auto-exclusions.
      }
      return next
    })
  }

  function addDescendants(set: Set<string>, nodes: FolderNode[]) {
    for (const n of nodes) {
      set.add(n.path)
      addDescendants(set, n.children ?? [])
    }
  }

  function removeDescendants(set: Set<string>, parentPath: string) {
    for (const key of [...set]) {
      if (key.startsWith(parentPath + '/')) set.delete(key)
    }
  }

  async function save() {
    setSaving(true)
    try {
      await SetExcludedFolders(workspaceId, [...excluded])
      onSaved()
      onClose()
    } catch (e: any) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal folder-picker-modal">
        <h2>Select Folders to Sync</h2>
        <p className="folder-picker-sub">{workspaceName} — unchecked folders will not be synced</p>

        {loading && <div className="folder-picker-loading">Loading folder tree…</div>}
        {error && <div className="folder-picker-error">{error}</div>}

        {!loading && !error && tree.length === 0 && (
          <div className="folder-picker-empty">No sub-folders found. Everything will be synced.</div>
        )}

        {!loading && tree.length > 0 && (
          <div className="folder-tree">
            {tree.map(node => (
              <FolderTreeNode
                key={node.path}
                node={node}
                excluded={excluded}
                onToggle={toggle}
                depth={0}
              />
            ))}
          </div>
        )}

        <div className="modal-footer">
          <span className="folder-picker-count">
            {excluded.size === 0
              ? 'All folders synced'
              : `${excluded.size} folder${excluded.size === 1 ? '' : 's'} excluded`}
          </span>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface NodeProps {
  node: FolderNode
  excluded: Set<string>
  onToggle: (path: string, children: FolderNode[]) => void
  depth: number
}

function FolderTreeNode({ node, excluded, onToggle, depth }: NodeProps) {
  const [open, setOpen] = useState(depth < 1)
  const isExcluded = excluded.has(node.path)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="folder-node" style={{ paddingLeft: depth * 18 }}>
      <div className={`folder-row ${isExcluded ? 'excluded' : ''}`}>
        <input
          type="checkbox"
          checked={!isExcluded}
          onChange={() => onToggle(node.path, node.children ?? [])}
          className="folder-check"
        />
        {hasChildren && (
          <button className="folder-expand" onClick={() => setOpen(o => !o)}>
            {open ? '▾' : '▸'}
          </button>
        )}
        {!hasChildren && <span className="folder-expand-spacer" />}
        <span className="folder-icon">📁</span>
        <span className="folder-name">{node.name}</span>
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map(child => (
            <FolderTreeNode
              key={child.path}
              node={child}
              excluded={excluded}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
