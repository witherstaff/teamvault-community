/**
 * @deprecated Use `@/lib/storage` instead. This module is kept only as a
 * compatibility shim for any external/unmigrated imports and will be removed.
 */
export {
    buildStorageKey as buildR2Key,
    deleteObject as deleteR2Object,
    generateUploadUrl,
    generateDownloadUrl,
    headObject,
} from '@/lib/storage'
