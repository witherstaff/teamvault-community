import { useState } from 'react'
import { formatBytes, UploadIcon } from './FileList'
import { VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS, VERIFIED_DOWNLOADS_FOLDER_NAME } from '@/lib/config'

export type WorkspaceInfo = {
    plan_id: string
    storage_limit_bytes: number
    storage_used_bytes: number
    root_folder_id?: string | null
}

interface UploadModalProps {
    workspaceId: string
    parentId: string | null
    workspaceInfo: WorkspaceInfo | null
    inVerifiedDownloads: boolean
    onClose: () => void
    onSuccess: (renames?: Array<{ original: string; resolved: string }>) => void
}

async function sha256Hex(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

export function UploadModal({ workspaceId, parentId, workspaceInfo, inVerifiedDownloads, onClose, onSuccess }: UploadModalProps) {
    const [files, setFiles] = useState<File[]>([])
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState<'idle' | 'uploading' | 'finalizing' | 'done' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [currentFileIndex, setCurrentFileIndex] = useState(0)

    const upload = async () => {
        if (files.length === 0 || !parentId) return
        setErrorMsg('')

        // 0. Validate limits upfront
        const totalUploadSize = files.reduce((acc, f) => acc + f.size, 0)

        if (totalUploadSize > 1_073_741_824) {
            setStatus('error')
            setErrorMsg('Total selected files exceed the 1GB maximum upload size limit.')
            return
        }

        if (workspaceInfo && workspaceInfo.storage_limit_bytes !== null) {
            if (workspaceInfo.storage_used_bytes + totalUploadSize > workspaceInfo.storage_limit_bytes) {
                setStatus('error')
                setErrorMsg(`Upload exceeds workspace storage limit. You are trying to upload ${formatBytes(totalUploadSize)} but only have ${formatBytes(workspaceInfo.storage_limit_bytes - workspaceInfo.storage_used_bytes)} left.`)
                return
            }
        }

        setStatus('uploading')

        const renames: Array<{ original: string; resolved: string }> = []

        try {
            for (let i = 0; i < files.length; i++) {
                setCurrentFileIndex(i)
                const file = files[i]
                const overallBaseProgress = (i / files.length) * 100

                // 1. Get presigned URL
                setProgress(Math.round(overallBaseProgress + (10 / files.length))) // 10% of this file's progress
                const res = await fetch('/api/vault/file/create-upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspace_id: workspaceId, parent_id: parentId, filename: file.name, mime_type: file.type || 'application/octet-stream', size_bytes: file.size }),
                })
                if (!res.ok) { const e = await res.json(); throw new Error(e.error || `Failed to initiate upload for ${file.name}`) }
                const { object_id, upload_url, resolved_filename } = await res.json()
                if (resolved_filename && resolved_filename !== file.name) {
                    renames.push({ original: file.name, resolved: resolved_filename })
                }

                // 2. PUT to R2
                setProgress(Math.round(overallBaseProgress + (40 / files.length)))
                const response = await fetch(upload_url, {
                    method: 'PUT',
                    body: file,
                    // Do NOT send any extra headers. The presigned URL handles the signature,
                    // and browsers handle Content-Type/Length natively with body: file.
                });

                if (!response.ok) {
                    throw new Error(`Upload failed for ${file.name}: ${response.status}`);
                }

                // 2.5. Compute SHA-256 checksum of the uploaded file
                setProgress(Math.round(overallBaseProgress + (80 / files.length)))
                const checksum_sha256 = await sha256Hex(file)

                // 3. Finalize
                setStatus('finalizing')
                setProgress(Math.round(overallBaseProgress + (90 / files.length)))
                const fin = await fetch('/api/vault/file/finalize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspace_id: workspaceId, object_id, checksum_sha256 }),
                })
                if (!fin.ok) { const e = await fin.json(); throw new Error(e.error || `Finalize failed for ${file.name}`) }

                setStatus('uploading') // Reset to uploading for the next file
            }

            setStatus('done')
            setProgress(100)
            setTimeout(() => { onSuccess(renames.length ? renames : undefined); onClose() }, 800)
        } catch (e) {
            setStatus('error')
            setErrorMsg(e instanceof Error ? e.message : 'Upload failed')
        }
    }

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Upload File</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {status === 'idle' || status === 'error' ? (
                        <div
                            style={{ border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color var(--transition)' }}
                            onClick={() => document.getElementById('file-input')?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); const dropped = Array.from(e.dataTransfer.files); if (dropped.length) setFiles(prev => [...prev, ...dropped]) }}
                        >
                            <input id="file-input" type="file" multiple style={{ display: 'none' }}
                                accept={inVerifiedDownloads ? VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS.join(',') : undefined}
                                onChange={(e) => {
                                    const selected = Array.from(e.target.files || [])
                                    if (selected.length) setFiles(prev => [...prev, ...selected])
                                    e.target.value = '' // Reset input so same file can be selected again if needed
                                }} />
                            {files.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '150px', overflowY: 'auto' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{files.length} file{files.length === 1 ? '' : 's'} selected ({formatBytes(files.reduce((a, b) => a + b.size, 0))})</div>
                                    {files.map((f, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', background: 'var(--surface-active)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }} title={f.name}>{f.name}</span>
                                            <span className="text-muted">{formatBytes(f.size)}</span>
                                        </div>
                                    ))}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFiles([]); setStatus('idle'); setErrorMsg('') }}
                                        className="btn btn-ghost btn-sm"
                                        style={{ marginTop: '0.5rem', alignSelf: 'center', color: 'var(--error)' }}
                                    >Clear files</button>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☁️</div>
                                    <div style={{ fontWeight: 500 }}>Drop files here or click to browse</div>
                                    <div className="text-muted text-sm mt-1">Max 1 GB total per upload</div>
                                    {inVerifiedDownloads && (
                                        <div className="text-muted text-sm mt-1" style={{ color: 'var(--warning, #f59e0b)' }}>
                                            ⚠️ Only {VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS.join(', ')} files are allowed in <strong>{VERIFIED_DOWNLOADS_FOLDER_NAME}</strong>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}

                    {(status === 'uploading' || status === 'finalizing') && (
                        <div>
                            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {status === 'uploading' || status === 'finalizing' ? `Uploading file ${currentFileIndex + 1} of ${files.length} (${progress}%)` : 'Finalizing…'}
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: status === 'finalizing' ? '100%' : `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    {status === 'done' && <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 500 }}>✓ Upload complete!</div>}
                    {status === 'error' && <div style={{ padding: '0.75rem', background: 'var(--error-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: '0.875rem' }}>{errorMsg}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={upload} disabled={!!(
                        files.length === 0 ||
                        files.reduce((acc, f) => acc + f.size, 0) > 1_073_741_824 || // Check if total exceeds 1GB
                        status === 'uploading' ||
                        status === 'finalizing' ||
                        status === 'done' ||
                        (workspaceInfo && workspaceInfo.storage_limit_bytes !== null && (workspaceInfo.storage_used_bytes + files.reduce((acc, f) => acc + f.size, 0) > workspaceInfo.storage_limit_bytes))
                    )}>
                        <UploadIcon /> Upload
                    </button>
                </div>
            </div>
        </div>
    )
}
