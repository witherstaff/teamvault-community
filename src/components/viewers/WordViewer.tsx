'use client'

import React, { useState, useEffect } from 'react'

export default function WordViewer({ url }: { url: string }) {
    const [html, setHtml] = useState<string | null>(null)
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const mammoth = (await import('mammoth')).default
                const resp = await fetch(url)
                const buf = await resp.arrayBuffer()
                const result = await mammoth.convertToHtml({ arrayBuffer: buf })
                if (!cancelled) setHtml(result.value)
            } catch (e: any) {
                if (!cancelled) setErr(e.message)
            }
        })()
        return () => { cancelled = true }
    }, [url])

    if (err) return <div style={{ color: 'var(--error)', padding: '1rem' }}>Failed to render document: {err}</div>
    if (!html) return <div className="text-muted" style={{ padding: '1rem' }}>Rendering document…</div>

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'auto', background: '#fff' }}>
            <style>{`
                .tv-doc { max-width: 800px; margin: 0 auto; padding: 2rem; font-family: Georgia, serif; font-size: 1rem; line-height: 1.7; color: #111; }
                .tv-doc h1,.tv-doc h2,.tv-doc h3,.tv-doc h4 { font-family: var(--font-sans); margin: 1.5rem 0 0.5rem; }
                .tv-doc p { margin: 0.5rem 0; }
                .tv-doc table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
                .tv-doc td,.tv-doc th { border: 1px solid #ccc; padding: 0.375rem 0.625rem; }
                .tv-doc th { background: #f3f4f6; font-weight: 600; }
                .tv-doc ul,.tv-doc ol { padding-left: 1.5rem; margin: 0.5rem 0; }
            `}</style>
            <div
                className="tv-doc"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    )
}
