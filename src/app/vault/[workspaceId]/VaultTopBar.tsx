'use client'

import React from 'react'
import { getPlan } from '@/lib/config'
import { formatBytes, ChevronIcon, UploadIcon } from '@/components/FileList'
import { WorkspaceInfo } from '@/components/UploadModal'

export type BreadcrumbItem = { id: string | null; name: string }

function PlusIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
    )
}

interface VaultTopBarProps {
    breadcrumbs: BreadcrumbItem[]
    navigateTo: (index: number) => void
    workspaceId: string
    workspaceInfo: WorkspaceInfo | null
    isAdmin: boolean
    canUpload: boolean
    currentParentId: string | null
    onOpenSearch: () => void
    onOpenCreateFolder: () => void
    onOpenUpload: () => void
    onToast: (msg: string, type: 'success' | 'error') => void
}

export default function VaultTopBar({
    breadcrumbs,
    navigateTo,
    workspaceId,
    workspaceInfo,
    isAdmin,
    canUpload,
    currentParentId,
    onOpenSearch,
    onOpenCreateFolder,
    onOpenUpload,
    onToast,
}: VaultTopBarProps) {
    const handleUpgradePortal = async () => {
        try {
            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspace_id: workspaceId })
            })
            const data = await res.json()
            if (data.url) window.location.href = data.url
            else onToast(data.error || 'Failed to open billing portal', 'error')
        } catch (e) {
            onToast('Error opening billing portal', 'error')
        }
    }

    return (
        <div className="topbar">
            {/* Breadcrumb */}
            <nav className="breadcrumb" style={{ flex: 1, minWidth: 0 }}>
                {breadcrumbs.map((b, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: 0 }}>
                        {i > 0 && <span className="breadcrumb-sep"><ChevronIcon /></span>}
                        <span
                            className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? 'current' : ''}`}
                            onClick={() => i < breadcrumbs.length - 1 && navigateTo(i)}
                        >
                            {b.name}
                        </span>
                    </span>
                ))}
            </nav>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={onOpenSearch} title="Search">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg> <span className="hidden-mobile">Search</span>
                </button>
                {workspaceInfo && (
                    <div className="hidden-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginRight: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 500 }}>
                                <span className="hidden-mobile">
                                    {formatBytes(workspaceInfo.storage_used_bytes, 2)} / {getPlan(workspaceInfo.plan_id).storageLimitLabel}
                                </span>
                                {workspaceInfo.storage_limit_bytes ? ` (${((workspaceInfo.storage_used_bytes / workspaceInfo.storage_limit_bytes) * 100).toFixed(2)}%)` : ''}
                            </span>
                        </div>
                        <div style={{ width: '120px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                background: workspaceInfo.storage_used_bytes / workspaceInfo.storage_limit_bytes > 0.9 ? 'var(--error)' : 'var(--accent)',
                                width: `${Math.min(100, (workspaceInfo.storage_used_bytes / (workspaceInfo.storage_limit_bytes || 1)) * 100)}%`,
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                )}
                {process.env.NEXT_PUBLIC_COMMERCIAL_MODE === 'true' && workspaceInfo && isAdmin && !getPlan(workspaceInfo.plan_id).internal && (
                    <button className="btn btn-ghost btn-sm hidden-mobile" onClick={handleUpgradePortal} title="Manage Subscription">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="hidden-mobile">Upgrade</span>
                    </button>
                )}

                {(isAdmin || canUpload) && (
                    <button className={`btn btn-secondary ${!currentParentId ? 'btn-sm' : ''}`} onClick={onOpenCreateFolder} title="New Folder">
                        <PlusIcon />
                    </button>
                )}
                {(isAdmin || canUpload) && currentParentId && (
                    <button className="btn btn-primary" onClick={onOpenUpload} title="Upload">
                        <UploadIcon /> <span className="hidden-mobile">Upload</span>
                    </button>
                )}
            </div>
        </div>
    )
}
