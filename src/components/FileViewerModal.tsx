'use client'

import React, { useState, useEffect } from 'react'
import { VaultObject } from './FileList'
import {
    isSupported,
    isImage,
    isVideo,
    isAudio,
    isPDF,
    isText,
    isExcel,
    isWord,
    isEpub,
} from './viewers/viewer-types'
import ExcelViewer from './viewers/ExcelViewer'
import WordViewer from './viewers/WordViewer'
import EpubViewer from './viewers/EpubViewer'

export function LinkIcon() {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '1.25rem', height: '1.25rem' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
    )
}

interface FileViewerModalProps {
    item: VaultObject
    workspaceId: string
    onClose: () => void
    onDownload: (item: VaultObject) => void
    folderPath?: string
}

export function FileViewerModal({ item, workspaceId, onClose, onDownload, folderPath }: FileViewerModalProps) {
    const [url, setUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const supported = isSupported(item)
    // 50 MB soft cap — Excel/Word are also subject to this
    const isTooLarge = (item.size_bytes || 0) > 50 * 1024 * 1024

    useEffect(() => {
        if (!supported || isTooLarge) { setLoading(false); return }

        let isMounted = true
        ;(async () => {
            try {
                const res = await fetch('/api/vault/file/download-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspace_id: workspaceId, object_id: item.id, attachment: false }),
                })
                if (!res.ok) throw new Error('Failed to generate preview link')
                const data = await res.json()
                if (isMounted) { setUrl(data.download_url); setLoading(false) }
            } catch (e: any) {
                if (isMounted) { setError(e.message); setLoading(false) }
            }
        })()

        return () => { isMounted = false }
    }, [item.id, workspaceId, supported, isTooLarge])

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    const copyLink = async () => {
        const link = `${window.location.origin}/vault/${workspaceId}?viewFile=${item.id}`
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            fetch('/api/vault/file/copy-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId, object_id: item.id }),
            }).catch(() => { })
        } catch (err) {
            console.error('Failed to copy', err)
        }
    }

    const useScrollWrapper = isText(item)

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ padding: '2rem' }}>
            <div className="modal" style={{ maxWidth: '90vw', width: '100%', maxHeight: '90vh', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <div style={{ overflow: 'hidden', minWidth: 0 }}>
                        <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }} title={item.name}>
                            {item.name}
                        </h3>
                        {folderPath && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={folderPath}>
                                📁 {folderPath}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={copyLink} title="Copy link to this file">
                            {copied ? 'Copied!' : <LinkIcon />}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => onDownload(item)}>
                            Download
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div className="modal-body" style={{
                    flex: 1, overflow: 'hidden', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-subtle)',
                }}>
                    {loading && <div className="text-muted">Loading preview...</div>}

                    {error && <div style={{ color: 'var(--error)' }}>Failed to load preview: {error}</div>}

                    {!loading && !error && !supported && (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                            <div style={{ fontWeight: 500 }}>No Preview Available</div>
                            <div className="text-muted text-sm mt-1">This file type ({item.mime_type || 'unknown'}) cannot be previewed.</div>
                        </div>
                    )}

                    {!loading && !error && isTooLarge && (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐘</div>
                            <div style={{ fontWeight: 500 }}>File is too large to preview</div>
                            <div className="text-muted text-sm mt-1">Files over 50MB must be downloaded directly.</div>
                        </div>
                    )}

                    {!loading && !error && url && (
                        <div style={{ width: '100%', height: '100%', overflow: useScrollWrapper ? 'auto' : 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                            {isImage(item) && (
                                <img src={url} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            )}

                            {isVideo(item) && (
                                <video src={url} controls style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            )}

                            {isAudio(item) && (
                                <audio src={url} controls style={{ width: '80%' }} />
                            )}

                            {isPDF(item) && (
                                <iframe src={url} title={item.name} style={{ width: '100%', height: '100%', border: 'none' }} />
                            )}

                            {isText(item) && (
                                <iframe src={url} style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} sandbox="allow-same-origin" />
                            )}

                            {isExcel(item) && <ExcelViewer url={url} />}

                            {isWord(item) && <WordViewer url={url} />}

                            {isEpub(item) && <EpubViewer url={url} />}

                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
export default FileViewerModal
