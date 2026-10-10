'use client'

import React, { useState, useEffect, useRef } from 'react'

interface TocItem {
    id: string
    href: string
    label: string
}

export default function EpubViewer({ url }: { url: string }) {
    const viewerRef = useRef<HTMLDivElement>(null)
    const [toc, setToc] = useState<TocItem[]>([])
    const [currentHref, setCurrentHref] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(true)
    const [err, setErr] = useState<string | null>(null)
    const renditionRef = useRef<any>(null)
    const bookRef = useRef<any>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const ePub = (await import('epubjs')).default
                const resp = await fetch(url)
                if (!resp.ok) throw new Error('Failed to fetch EPUB file')
                const buf = await resp.arrayBuffer()

                if (cancelled) return

                const book = ePub(buf)
                bookRef.current = book

                await book.ready

                if (cancelled) {
                    book.destroy()
                    return
                }

                if (viewerRef.current) {
                    viewerRef.current.innerHTML = ''
                    const rendition = book.renderTo(viewerRef.current, {
                        width: '100%',
                        height: '100%',
                        flow: 'scrolled-doc',
                    })
                    renditionRef.current = rendition

                    rendition.on('relocated', (location: any) => {
                        if (!cancelled && location?.start?.href) {
                            setCurrentHref(location.start.href)
                        }
                    })

                    await rendition.display()
                }

                const nav = await book.loaded.navigation
                if (!cancelled && nav?.toc) {
                    const flattenToc = (items: any[]): TocItem[] => {
                        let res: TocItem[] = []
                        for (const item of items) {
                            res.push({
                                id: item.id || item.href,
                                href: item.href,
                                label: (item.label || 'Untitled').trim(),
                            })
                            if (item.subitems && item.subitems.length > 0) {
                                res = res.concat(flattenToc(item.subitems))
                            }
                        }
                        return res
                    }
                    setToc(flattenToc(nav.toc))
                }

                if (!cancelled) setLoading(false)
            } catch (e: any) {
                if (!cancelled) {
                    setErr(e.message || 'Failed to render EPUB')
                    setLoading(false)
                }
            }
        })()

        return () => {
            cancelled = true
            if (bookRef.current) {
                try {
                    bookRef.current.destroy()
                } catch (_) { }
            }
        }
    }, [url])

    const handlePrev = () => renditionRef.current?.prev()
    const handleNext = () => renditionRef.current?.next()
    const handleSelectChapter = (href: string) => {
        if (renditionRef.current && href) {
            renditionRef.current.display(href)
            setCurrentHref(href)
        }
    }

    if (err) return <div style={{ color: 'var(--error)', padding: '1rem' }}>Failed to render book: {err}</div>

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', gap: '0.5rem',
                borderBottom: '1px solid var(--border)', background: 'var(--surface)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    {toc.length > 0 ? (
                        <select
                            value={currentHref}
                            onChange={(e) => handleSelectChapter(e.target.value)}
                            style={{
                                padding: '0.25rem 0.5rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)', background: 'var(--bg-subtle)',
                                color: 'var(--text-primary)', cursor: 'pointer', maxWidth: '320px',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            <option value="" disabled>Table of Contents…</option>
                            {toc.map((item, idx) => (
                                <option key={item.id || idx} value={item.href}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>EPUB Document</span>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button
                        onClick={handlePrev}
                        disabled={loading}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem' }}
                        title="Previous Page"
                    >
                        ◀ Prev
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={loading}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem' }}
                        title="Next Page"
                    >
                        Next ▶
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', background: '#fff', overflow: 'hidden' }}>
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255, 255, 255, 0.9)', zIndex: 10,
                        color: 'var(--text-muted)'
                    }}>
                        Rendering e-book…
                    </div>
                )}
                <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    )
}
