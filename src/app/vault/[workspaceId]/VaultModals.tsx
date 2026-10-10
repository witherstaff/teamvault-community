'use client'

import React from 'react'
import { VaultObject } from '@/components/FileList'
import { WorkspaceInfo, UploadModal } from '@/components/UploadModal'
import { CreateFolderModal } from '@/components/CreateFolderModal'
import { RenameModal } from '@/components/RenameModal'
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal'
import { DeleteBatchConfirmModal } from '@/components/DeleteBatchConfirmModal'
import { SearchModal } from '@/components/SearchModal'
import { MoveModal } from '@/components/MoveModal'
import { LinkOptionsModal } from '@/components/LinkOptionsModal'
import { FileViewerModal } from '@/components/FileViewerModal'

interface VaultModalsProps {
    workspaceId: string
    isAdmin: boolean
    currentParentId: string | null
    workspaceInfo: WorkspaceInfo | null
    inVerifiedDownloads: boolean
    showSearch: boolean
    onCloseSearch: () => void
    showUpload: boolean
    onCloseUpload: () => void
    showCreateFolder: boolean
    onCloseCreateFolder: () => void
    renameItem: VaultObject | null
    onCloseRename: () => void
    deleteItem: VaultObject | null
    onCloseDelete: () => void
    deleteBatchItems: VaultObject[] | null
    onCloseDeleteBatch: () => void
    linkOptionsFile: VaultObject | null
    onCloseLinkOptions: () => void
    moveItems: VaultObject[] | null
    onCloseMove: () => void
    viewItem: VaultObject | null
    onCloseView: () => void
    viewItemFolderPath?: string
    onEnterFolder: (folder: VaultObject) => void
    onDownload: (item: VaultObject) => void
    onReload: () => void
    onToast: (msg: string, type: 'success' | 'error') => void
}

export default function VaultModals({
    workspaceId,
    isAdmin,
    currentParentId,
    workspaceInfo,
    inVerifiedDownloads,
    showSearch,
    onCloseSearch,
    showUpload,
    onCloseUpload,
    showCreateFolder,
    onCloseCreateFolder,
    renameItem,
    onCloseRename,
    deleteItem,
    onCloseDelete,
    deleteBatchItems,
    onCloseDeleteBatch,
    linkOptionsFile,
    onCloseLinkOptions,
    moveItems,
    onCloseMove,
    viewItem,
    onCloseView,
    viewItemFolderPath,
    onEnterFolder,
    onDownload,
    onReload,
    onToast,
}: VaultModalsProps) {
    return (
        <>
            {showSearch && (
                <SearchModal
                    workspaceId={workspaceId}
                    isAdmin={isAdmin}
                    onClose={onCloseSearch}
                    onNavigateToFolder={(folder) => { onEnterFolder(folder); onCloseSearch() }}
                    onViewItem={(item) => { onToast(`Opening ${item.name}`, 'success'); onCloseSearch() }}
                    onDownload={(item) => onDownload(item)}
                    onRename={onCloseSearch}
                    onDelete={onCloseSearch}
                />
            )}
            {showUpload && currentParentId && (
                <UploadModal
                    workspaceId={workspaceId}
                    parentId={currentParentId}
                    workspaceInfo={workspaceInfo}
                    inVerifiedDownloads={inVerifiedDownloads}
                    onClose={onCloseUpload}
                    onSuccess={(renames) => {
                        onReload()
                        onToast('File uploaded successfully', 'success')
                        renames?.forEach(r => onToast(`"${r.original}" saved as "${r.resolved}"`, 'success'))
                    }}
                />
            )}
            {showCreateFolder && (
                <CreateFolderModal
                    workspaceId={workspaceId}
                    parentId={currentParentId}
                    onClose={onCloseCreateFolder}
                    onSuccess={() => { onReload(); onToast('Folder created', 'success') }}
                />
            )}
            {renameItem && (
                <RenameModal
                    item={renameItem}
                    workspaceId={workspaceId}
                    onClose={onCloseRename}
                    onSuccess={(newName) => { onReload(); onToast(`Renamed to ${newName}`, 'success') }}
                />
            )}
            {deleteItem && (
                <DeleteConfirmModal
                    item={deleteItem}
                    workspaceId={workspaceId}
                    onClose={onCloseDelete}
                    onSuccess={() => { onReload(); onToast(`${deleteItem.name} deleted`, 'success') }}
                />
            )}
            {deleteBatchItems && (
                <DeleteBatchConfirmModal
                    items={deleteBatchItems}
                    workspaceId={workspaceId}
                    onClose={onCloseDeleteBatch}
                    onSuccess={() => { onReload(); onToast('Deleted items', 'success') }}
                />
            )}
            {linkOptionsFile && (
                <LinkOptionsModal
                    workspaceId={workspaceId}
                    objectId={linkOptionsFile.id}
                    filename={linkOptionsFile.name}
                    onClose={onCloseLinkOptions}
                />
            )}
            {moveItems && (
                <MoveModal
                    items={moveItems}
                    workspaceId={workspaceId}
                    onClose={onCloseMove}
                    onSuccess={(renames) => {
                        onReload()
                        onToast(`Moved ${moveItems.length} item${moveItems.length > 1 ? 's' : ''}`, 'success')
                        renames?.forEach(r => onToast(`"${r.original}" renamed to "${r.resolved}"`, 'success'))
                    }}
                />
            )}
            {viewItem && (
                <FileViewerModal
                    item={viewItem}
                    workspaceId={workspaceId}
                    onClose={onCloseView}
                    onDownload={(item) => onDownload(item)}
                    folderPath={viewItemFolderPath}
                />
            )}
        </>
    )
}
