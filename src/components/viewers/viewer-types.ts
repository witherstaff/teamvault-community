import { VaultObject } from '../FileList'

export function isExcel(item: VaultObject) {
    return !!(
        item.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        item.mime_type === 'application/vnd.ms-excel' ||
        item.mime_type === 'application/vnd.oasis.opendocument.spreadsheet' ||
        item.name.match(/\.(xlsx|xls|xlsm|xlsb|ods)$/i)
    )
}

export function isWord(item: VaultObject) {
    return !!(
        item.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        item.mime_type === 'application/msword' ||
        item.name.match(/\.(docx|doc)$/i)
    )
}

export function isImage(item: VaultObject) { return !!item.mime_type?.startsWith('image/') }
export function isVideo(item: VaultObject) { return !!item.mime_type?.startsWith('video/') }
export function isAudio(item: VaultObject) { return !!item.mime_type?.startsWith('audio/') }
export function isPDF(item: VaultObject) { return item.mime_type === 'application/pdf' || item.name.match(/\.pdf$/i) }
export function isEpub(item: VaultObject) {
    return !!(
        item.mime_type === 'application/epub+zip' ||
        item.name.match(/\.epub$/i)
    )
}
export function isText(item: VaultObject) {
    return !!(
        item.mime_type?.startsWith('text/') ||
        item.mime_type === 'application/json' ||
        item.name.match(/\.(txt|md|csv|json|js|ts|jsx|tsx|html|css|py|java|c|cpp|go|rs|php|rb|sql)$/i)
    )
}

export function isSupported(item: VaultObject) {
    return isImage(item) || isVideo(item) || isAudio(item) || isPDF(item) || isText(item) || isExcel(item) || isWord(item) || isEpub(item)
}
