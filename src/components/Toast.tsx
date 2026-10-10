import { useEffect } from 'react'

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
    return (
        <div className={`toast ${type}`}>
            <span>{type === 'success' ? '✓' : '✕'}</span>
            <span>{message}</span>
        </div>
    )
}
