'use client'

import React, { useState, useEffect } from 'react'

export default function ExcelViewer({ url }: { url: string }) {
    const [html, setHtml] = useState<string | null>(null)
    const [sheets, setSheets] = useState<string[]>([])
    const [active, setActive] = useState(0)
    const [sheetHtmls, setSheetHtmls] = useState<string[]>([])
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const XLSX = await import('xlsx')
                const resp = await fetch(url)
                const buf = await resp.arrayBuffer()
                const wb = XLSX.read(buf, { type: 'array' })
                const names = wb.SheetNames
                const htmls = names.map(name =>
                    XLSX.utils.sheet_to_html(wb.Sheets[name], { header: '', footer: '' })
                )
                if (!cancelled) {
                    setSheets(names)
                    setSheetHtmls(htmls)
                    setHtml(htmls[0])
                }
            } catch (e: any) {
                if (!cancelled) setErr(e.message)
            }
        })()
        return () => { cancelled = true }
    }, [url])

    if (err) return <div style={{ color: 'var(--error)', padding: '1rem' }}>Failed to render spreadsheet: {err}</div>
    if (!html) return <div className="text-muted" style={{ padding: '1rem' }}>Rendering spreadsheet…</div>

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {sheets.length > 1 && (
                <div style={{
                    display: 'flex', gap: '0.25rem', padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--border)', background: 'var(--surface)',
                    flexShrink: 0, overflowX: 'auto',
                }}>
                    {sheets.map((name, i) => (
                        <button
                            key={name}
                            onClick={() => { setActive(i); setHtml(sheetHtmls[i]) }}
                            style={{
                                padding: '0.25rem 0.75rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)', cursor: 'pointer',
                                background: i === active ? 'var(--accent)' : 'var(--surface)',
                                color: i === active ? '#fff' : 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}
            <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
                <style>{`
                    .tv-xl { color: #111; }
                    .tv-xl table { border-collapse: collapse; font-size: 0.8125rem; font-family: sans-serif; }
                    .tv-xl td, .tv-xl th { border: 1px solid #d0d0d0; padding: 0.25rem 0.5rem; white-space: nowrap; color: #111; background: #fff; }
                    .tv-xl tr:first-child td, .tv-xl tr:first-child th { background: #f3f4f6; font-weight: 600; }
                    .tv-xl tr:hover td { background: #eef2ff; }
                `}</style>
                <div
                    className="tv-xl"
                    style={{ padding: '0.75rem' }}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>
        </div>
    )
}
