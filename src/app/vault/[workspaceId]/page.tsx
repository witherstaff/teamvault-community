'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'
import { VERIFIED_DOWNLOADS_FOLDER_NAMES } from '@/lib/config'
import { FileList, VaultObject, formatBytes } from '@/components/FileList'
import { WorkspaceInfo } from '@/components/UploadModal'
import { Toast } from '@/components/Toast'
import VaultTopBar, { BreadcrumbItem } from './VaultTopBar'
import VaultModals from './VaultModals'

export default function VaultPage() {
    const { user, isLoading: isUserLoading } = useUser()
    const params = useParams()
    const [isClient, setIsClient] = useState(false)

    useEffect(() => { setIsClient(true) }, [])

    useEffect(() => {
        if (isUserLoading) return
        if (!user) {
            const returnTo = window.location.pathname + window.location.search
            window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
        }
    }, [user, isUserLoading])

    const [items, setItems] = useState<VaultObject[]>([])
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: '/' }])
    const [loading, setLoading] = useState(false)
    const [initialLoadDone, setInitialLoadDone] = useState(false)
    const [showUpload, setShowUpload] = useState(false)
    const [showCreateFolder, setShowCreateFolder] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' }>>([])
    const workspaceId = params?.workspaceId as string
    const [isAdmin, setIsAdmin] = useState(false)
    const [canUpload, setCanUpload] = useState(false)
    const [viewItem, setViewItem] = useState<VaultObject | null>(null)
    const [viewItemFolderPath, setViewItemFolderPath] = useState<string | undefined>(undefined)
    const [renameItem, setRenameItem] = useState<VaultObject | null>(null)
    const [deleteItem, setDeleteItem] = useState<VaultObject | null>(null)
    const [deleteBatchItems, setDeleteBatchItems] = useState<VaultObject[] | null>(null)
    const [moveItems, setMoveItems] = useState<VaultObject[] | null>(null)
    const [linkOptionsFile, setLinkOptionsFile] = useState<VaultObject | null>(null)
    const [revokeStatus, setRevokeStatus] = useState<Record<string, boolean>>({})
    const [selectedFiles, setSelectedFiles] = useState<VaultObject[]>([])
    const [fileStatusMap, setFileStatusMap] = useState<Record<string, 'revoked' | 'exhausted' | 'expired' | 'active'>>({})
    const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)

    const currentParent = breadcrumbs[breadcrumbs.length - 1]

    const inVerifiedDownloads = breadcrumbs.some(
        (b) => VERIFIED_DOWNLOADS_FOLDER_NAMES.includes(b.name.toLowerCase().trim())
    )

    const addToast = useCallback((message: string, type: 'success' | 'error') => {
        const id = Date.now()
        setToasts((t) => [...t, { id, message, type }])
    }, [])

    const loadItems = useCallback(async () => {
        if (!workspaceId) return
        setLoading(true)
        try {
            const infoRes = await fetch(`/api/vault/workspace-info?workspace_id=${workspaceId}`)
            let info = null
            if (infoRes.ok) {
                info = await infoRes.json()
                setWorkspaceInfo(info)
            }

            let targetParentId = currentParent.id
            if (currentParent.id === null && info?.root_folder_id) {
                targetParentId = info.root_folder_id
                setBreadcrumbs(prev => prev.map((b, i) => i === 0 ? { ...b, id: targetParentId } : b))
                return
            }

            const param = targetParentId ? `&parent_id=${targetParentId}` : '&parent_id=null'
            const res = await fetch(`/api/vault/list?workspace_id=${workspaceId}${param}`)

            if (res.ok) setItems(await res.json())
            else { const e = await res.json(); addToast(e.error || 'Failed to load files', 'error') }
        } finally {
            setLoading(false)
            setInitialLoadDone(true)
        }
    }, [workspaceId, currentParent.id, addToast])

    const loadFileStatus = useCallback(async () => {
        if (!inVerifiedDownloads || !currentParent.id) { setFileStatusMap({}); return }
        const res = await fetch(`/api/vault/verified/file-status?workspace_id=${workspaceId}&parent_id=${currentParent.id}`)
        if (res.ok) setFileStatusMap(await res.json())
        else setFileStatusMap({})
    }, [inVerifiedDownloads, workspaceId, currentParent.id])

    useEffect(() => { loadItems() }, [loadItems])
    useEffect(() => { loadFileStatus() }, [loadFileStatus])

    // Handle viewFile URL parameter
    useEffect(() => {
        if (!isClient || !initialLoadDone || !workspaceId) return

        const searchParams = new URLSearchParams(window.location.search)
        const viewFileId = searchParams.get('viewFile')

        if (viewFileId && !viewItem) {
            fetch(`/api/vault/object/info?workspace_id=${workspaceId}&object_id=${viewFileId}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) {
                        setViewItem(data)
                        if (data.parent_id !== currentParent.id && data.folder_path) {
                            setViewItemFolderPath(data.folder_path)
                        }
                        const newUrl = new URL(window.location.href)
                        newUrl.searchParams.delete('viewFile')
                        window.history.replaceState({}, '', newUrl.toString())
                    } else {
                        addToast('File not found or access denied', 'error')
                    }
                })
                .catch(err => {
                    console.error('Failed to load shared file', err)
                    addToast('Failed to load shared file', 'error')
                })
        }
    }, [isClient, initialLoadDone, workspaceId, viewItem, addToast, currentParent.id])

    useEffect(() => {
        if (!user || !workspaceId) return
        fetch(`/api/user/membership?workspace_id=${workspaceId}`, { credentials: 'same-origin' })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.role === 'admin') setIsAdmin(true)
                if (data?.can_upload) setCanUpload(true)
            })
            .catch(() => { })
    }, [user, workspaceId])

    const enterFolder = (folder: VaultObject) => {
        setBreadcrumbs((b) => [...b, { id: folder.id, name: folder.name }])
        setShowSearch(false)
    }

    const navigateTo = (index: number) => {
        setBreadcrumbs((b) => b.slice(0, index + 1))
    }

    const download = async (item: VaultObject, attachment: boolean = true) => {
        const res = await fetch('/api/vault/file/download-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspace_id: workspaceId, object_id: item.id, attachment }),
        })
        if (res.ok) {
            const { download_url } = await res.json()
            window.open(download_url, '_blank')
            if (attachment) addToast(`Downloading ${item.name}`, 'success')
        } else {
            const e = await res.json()
            addToast(e.error || 'Request failed', 'error')
        }
    }

    const downloadBatch = async (batchItems: VaultObject[]) => {
        const totalSize = batchItems.reduce((acc, f) => acc + (f.size_bytes || 0), 0)
        if (totalSize > 50 * 1024 * 1024) {
            addToast(`Batch too large (${formatBytes(totalSize)}). Max limit is 50 MB.`, 'error')
            return
        }

        addToast(`Zipping ${batchItems.length} items...`, 'success')

        try {
            const res = await fetch('/api/vault/download/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    object_ids: batchItems.map(i => i.id)
                }),
            })
            if (!res.ok) throw new Error(await res.text())

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.style.display = 'none'
            a.href = url

            const disposition = res.headers.get('Content-Disposition')
            let filename = `TeamVault_Export_${new Date().toISOString().split('T')[0]}.zip`
            if (disposition && disposition.includes('filename="')) {
                filename = disposition.split('filename="')[1].split('"')[0]
            }

            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (e: any) {
            addToast(e.message || 'Batch download failed', 'error')
        }
    }

    return (
        <>
            <VaultTopBar
                breadcrumbs={breadcrumbs}
                navigateTo={navigateTo}
                workspaceId={workspaceId}
                workspaceInfo={workspaceInfo}
                isAdmin={isAdmin}
                canUpload={canUpload}
                currentParentId={currentParent.id}
                onOpenSearch={() => setShowSearch(true)}
                onOpenCreateFolder={() => setShowCreateFolder(true)}
                onOpenUpload={() => setShowUpload(true)}
                onToast={addToast}
            />

            <div className="content">
                <div className="card">
                    {loading ? (
                        <div className="empty-state">Loading…</div>
                    ) : items.length === 0 ? (
                        <div className="empty-state">
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗂️</div>
                            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>This folder is empty</div>
                            <div style={{ fontSize: '0.8125rem' }}>Upload files or create a subfolder to get started.</div>
                        </div>
                    ) : (
                        <FileList
                            items={items}
                            isAdmin={isAdmin}
                            onNavigateToFolder={(obj) => obj.type === 'folder' ? enterFolder(obj) : setViewItem(obj)}
                            onDownload={(item) => download(item)}
                            onDownloadBatch={downloadBatch}
                            onMoveBatch={(moveList) => setMoveItems(moveList)}
                            onDeleteBatch={(delList) => setDeleteBatchItems(delList)}
                            onSelectionChange={(selList) => setSelectedFiles(selList)}
                            onRename={(item) => setRenameItem(item)}
                            onDelete={(item) => setDeleteItem(item)}
                            fileStatusMap={inVerifiedDownloads ? fileStatusMap : undefined}
                            onLinkOptions={inVerifiedDownloads && isAdmin ? (file) => setLinkOptionsFile(file) : undefined}
                            onToggleRevoke={inVerifiedDownloads && isAdmin ? async (file) => {
                                const isRevoked = revokeStatus[file.id] ?? false
                                const res = await fetch('/api/vault/verified/revoke', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ workspace_id: workspaceId, object_id: file.id, revoked: !isRevoked }),
                                })
                                if (res.ok) {
                                    const d = await res.json()
                                    setRevokeStatus(s => ({ ...s, [file.id]: d.is_revoked }))
                                    setFileStatusMap(m => ({ ...m, [file.id]: d.is_revoked ? 'revoked' : 'active' }))
                                    addToast(d.is_revoked ? 'Access revoked' : 'Access enabled', d.is_revoked ? 'error' : 'success')
                                }
                            } : undefined}
                            revokeStatus={inVerifiedDownloads && isAdmin ? revokeStatus : undefined}
                        />
                    )}
                </div>
            </div>

            <VaultModals
                workspaceId={workspaceId}
                isAdmin={isAdmin}
                currentParentId={currentParent.id}
                workspaceInfo={workspaceInfo}
                inVerifiedDownloads={inVerifiedDownloads}
                showSearch={showSearch}
                onCloseSearch={() => setShowSearch(false)}
                showUpload={showUpload}
                onCloseUpload={() => setShowUpload(false)}
                showCreateFolder={showCreateFolder}
                onCloseCreateFolder={() => setShowCreateFolder(false)}
                renameItem={renameItem}
                onCloseRename={() => setRenameItem(null)}
                deleteItem={deleteItem}
                onCloseDelete={() => setDeleteItem(null)}
                deleteBatchItems={deleteBatchItems}
                onCloseDeleteBatch={() => setDeleteBatchItems(null)}
                linkOptionsFile={linkOptionsFile}
                onCloseLinkOptions={() => setLinkOptionsFile(null)}
                moveItems={moveItems}
                onCloseMove={() => setMoveItems(null)}
                viewItem={viewItem}
                onCloseView={() => { setViewItem(null); setViewItemFolderPath(undefined) }}
                viewItemFolderPath={viewItemFolderPath}
                onEnterFolder={enterFolder}
                onDownload={download}
                onReload={loadItems}
                onToast={addToast}
            />

            <div className="toast-container">
                {toasts.map((t) => (
                    <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} />
                ))}
            </div>
        </>
    )
}
