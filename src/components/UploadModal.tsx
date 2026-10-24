import { useState, useRef } from 'react'
import { formatBytes, UploadIcon } from './FileList'
import { VERIFIED_DOWNLOADS_ALLOWED_EXTENSIONS, VERIFIED_DOWNLOADS_FOLDER_NAME, MAX_FILE_SIZE_BYTES } from '@/lib/config'

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
    const [currentFileUploadedBytes, setCurrentFileUploadedBytes] = useState(0)
    const [currentFileTotalBytes, setCurrentFileTotalBytes] = useState(0)
    const [waitingSeconds, setWaitingSeconds] = useState(0)
    const [status, setStatus] = useState<'idle' | 'uploading' | 'finalizing' | 'done' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [currentFileIndex, setCurrentFileIndex] = useState(0)
    const activeXhrRef = useRef<XMLHttpRequest | null>(null)

    const handleClose = () => {
        if (activeXhrRef.current) {
            console.log('[UPLOAD] User cancelled upload, aborting XHR request...')
            activeXhrRef.current.abort()
            activeXhrRef.current = null
        }
        onClose()
    }

    const upload = async () => {
        if (files.length === 0 || !parentId) return
        setErrorMsg('')
        setWaitingSeconds(0)

        // 0. Validate limits upfront
        const totalUploadSize = files.reduce((acc, f) => acc + f.size, 0)

        if (totalUploadSize > MAX_FILE_SIZE_BYTES) {
            setStatus('error')
            setErrorMsg(`Total selected files exceed the ${formatBytes(MAX_FILE_SIZE_BYTES)} maximum upload size limit.`)
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
                setWaitingSeconds(0)
                const file = files[i]
                const overallBaseProgress = (i / files.length) * 100

                console.log(`[UPLOAD] Starting file ${i + 1}/${files.length}: "${file.name}" (${file.size} bytes / ${formatBytes(file.size)})`)

                // 1. Get presigned URL
                setProgress(Math.round(overallBaseProgress + (5 / files.length)))
                const res = await fetch('/api/vault/file/create-upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspace_id: workspaceId, parent_id: parentId, filename: file.name, mime_type: file.type || 'application/octet-stream', size_bytes: file.size }),
                })
                if (!res.ok) {
                    const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
                    console.error('[UPLOAD ERROR] /api/vault/file/create-upload failed:', e)
                    throw new Error(e.error || `Failed to initiate upload for ${file.name}`)
                }
                const { object_id, upload_url, resolved_filename } = await res.json()
                console.log(`[UPLOAD] Presigned URL obtained for object_id: ${object_id}`)

                if (resolved_filename && resolved_filename !== file.name) {
                    renames.push({ original: file.name, resolved: resolved_filename })
                }

                // 2. PUT to R2 / S3 via XMLHttpRequest for real-time progress
                setCurrentFileUploadedBytes(0)
                setCurrentFileTotalBytes(file.size)

                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest()
                    activeXhrRef.current = xhr
                    xhr.timeout = 0 // Never timeout large file transfers
                    xhr.open('PUT', upload_url)

                    let serverWaitInterval: NodeJS.Timeout | null = null
                    let secondsTimer: NodeJS.Timeout | null = null

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable && event.total > 0) {
                            setCurrentFileUploadedBytes(event.loaded)
                            setCurrentFileTotalBytes(event.total)
                            const fileFraction = Math.min(1, event.loaded / event.total)

                            if (event.loaded < event.total) {
                                // Scale byte transmission from 5% to 90%
                                const currentFileProgress = 5 + (fileFraction * 85)
                                const overall = overallBaseProgress + (currentFileProgress / files.length)
                                setProgress(Math.min(90, Math.round(overall)))
                            } else {
                                // All bytes sent to storage server, now awaiting S3/R2 HTTP 200 response
                                console.log(`[UPLOAD] 100% of bytes written to socket (${event.loaded} bytes). Awaiting storage server response...`)
                                setProgress(Math.round(overallBaseProgress + (91 / files.length)))

                                if (!serverWaitInterval) {
                                    let waitTick = 91
                                    serverWaitInterval = setInterval(() => {
                                        if (waitTick < 95) {
                                            waitTick += 1
                                            setProgress(Math.round(overallBaseProgress + (waitTick / files.length)))
                                        }
                                    }, 2000)
                                }

                                if (!secondsTimer) {
                                    secondsTimer = setInterval(() => {
                                        setWaitingSeconds(s => s + 1)
                                    }, 1000)
                                }
                            }
                        }
                    }

                    const cleanup = () => {
                        if (serverWaitInterval) {
                            clearInterval(serverWaitInterval)
                            serverWaitInterval = null
                        }
                        if (secondsTimer) {
                            clearInterval(secondsTimer)
                            secondsTimer = null
                        }
                        activeXhrRef.current = null
                    }

                    xhr.onreadystatechange = () => {
                        console.log(`[STORAGE PUT] readyState=${xhr.readyState}, status=${xhr.status}`)
                    }

                    xhr.onload = () => {
                        cleanup()
                        console.log(`[STORAGE PUT] Completed with HTTP ${xhr.status} ${xhr.statusText}`)
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve()
                        } else {
                            console.error(`[STORAGE PUT ERROR BODY]`, xhr.responseText)
                            reject(new Error(`Storage upload failed for ${file.name} (HTTP ${xhr.status}: ${xhr.statusText || 'Error'}). ${xhr.responseText || ''}`))
                        }
                    }

                    xhr.onerror = (e) => {
                        cleanup()
                        console.error(`[STORAGE PUT ONERROR]`, e, 'readyState:', xhr.readyState, 'status:', xhr.status)
                        reject(new Error(
                            `Storage upload blocked by browser (CORS or network error). Ensure your Cloudflare R2 / S3 bucket has a CORS policy allowing PUT requests from this domain.`
                        ))
                    }

                    xhr.ontimeout = () => {
                        cleanup()
                        console.error(`[STORAGE PUT TIMEOUT]`)
                        reject(new Error(`Storage upload timed out while sending to storage provider.`))
                    }

                    xhr.onabort = () => {
                        cleanup()
                        console.warn(`[STORAGE PUT ABORTED]`)
                        reject(new Error('Upload cancelled'))
                    }

                    console.log(`[STORAGE PUT] Sending ${file.name} (${file.size} bytes) via direct PUT...`)
                    xhr.send(file)
                })

                // 2.5. Compute SHA-256 checksum (only for files <= 100MB to avoid tab out-of-memory freeze)
                let checksum_sha256: string | undefined = undefined
                if (file.size <= 100 * 1024 * 1024) {
                    try {
                        console.log(`[UPLOAD] Computing SHA-256 integrity hash for ${file.name}...`)
                        checksum_sha256 = await sha256Hex(file)
                    } catch (hashErr) {
                        console.warn('[UPLOAD] SHA-256 calculation skipped/failed:', hashErr)
                    }
                } else {
                    console.log(`[UPLOAD] File size (${formatBytes(file.size)}) > 100 MB, skipping client-side SHA-256 to conserve browser memory.`)
                }

                // 3. Finalize
                setStatus('finalizing')
                setProgress(Math.round(overallBaseProgress + (96 / files.length)))
                console.log(`[UPLOAD] Finalizing database record for object ${object_id}...`)

                const fin = await fetch('/api/vault/file/finalize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspace_id: workspaceId, object_id, checksum_sha256 }),
                })
                if (!fin.ok) {
                    const e = await fin.json().catch(() => ({ error: `HTTP ${fin.status}` }))
                    console.error('[UPLOAD ERROR] Finalize failed:', e)
                    throw new Error(e.error || `Finalize failed for ${file.name}`)
                }

                console.log(`[UPLOAD] Successfully finalized file "${file.name}"!`)
                setStatus('uploading') // Reset to uploading for next file if multiple
            }

            setStatus('done')
            setProgress(100)
            setTimeout(() => { onSuccess(renames.length ? renames : undefined); onClose() }, 800)
        } catch (e) {
            console.error('[UPLOAD PROCESS ERROR]', e)
            setStatus('error')
            setErrorMsg(e instanceof Error ? e.message : 'Upload failed')
        }
    }

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Upload File</h3>
                    <button className="btn btn-ghost btn-sm" onClick={handleClose}>✕</button>
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
                                    <div className="text-muted text-sm mt-1">Max {formatBytes(MAX_FILE_SIZE_BYTES)} total per upload</div>
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
                            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>
                                    {status === 'finalizing'
                                        ? 'Saving to TeamVault…'
                                        : (currentFileTotalBytes > 0 && currentFileUploadedBytes >= currentFileTotalBytes
                                            ? `Committing with storage provider (waiting for confirmation${waitingSeconds > 0 ? `: ${waitingSeconds}s` : ''})…`
                                            : `Uploading ${files[currentFileIndex]?.name || ''} (${currentFileIndex + 1}/${files.length})`)}
                                </span>
                                <span style={{ fontWeight: 600 }}>{progress}%</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                            {status === 'uploading' && currentFileTotalBytes > 0 && (
                                <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted, #888)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>
                                        {currentFileUploadedBytes >= currentFileTotalBytes
                                            ? `All bytes sent. Storage provider writing object (${waitingSeconds}s elapsed)…`
                                            : files[currentFileIndex]?.name || ''}
                                    </span>
                                    <span>
                                        {formatBytes(currentFileUploadedBytes)} of {formatBytes(currentFileTotalBytes)}
                                    </span>
                                </div>
                            )}
                            {currentFileUploadedBytes >= currentFileTotalBytes && waitingSeconds > 15 && status === 'uploading' && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--surface-active, rgba(255,255,255,0.05))', padding: '0.5rem', borderRadius: '4px', textAlign: 'left' }}>
                                    💡 <strong>Note:</strong> Multi-gigabyte files (1.5 GB+) require cloud storage providers (S3/Cloudflare R2) to verify data integrity, assemble parts, and replicate across clusters. Please keep this browser window open.
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'done' && <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 500 }}>✓ Upload complete!</div>}
                    {status === 'error' && <div style={{ padding: '0.75rem', background: 'var(--error-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: '0.875rem' }}>{errorMsg}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={upload} disabled={!!(
                        files.length === 0 ||
                        files.reduce((acc, f) => acc + f.size, 0) > MAX_FILE_SIZE_BYTES ||
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
