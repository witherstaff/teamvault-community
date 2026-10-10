'use client'
import { useState, useRef, useEffect } from 'react'
import { COUNTRIES, countryFlag, type Country } from '@/lib/countries'

interface CountryPickerProps {
    value: string[]           // selected ISO codes (uppercase)
    onChange: (codes: string[]) => void
}

export function CountryPicker({ value, onChange }: CountryPickerProps) {
    const [search, setSearch] = useState('')
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setSearch('')
            }
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    const selectedSet = new Set(value.map(c => c.toUpperCase()))

    const filtered: Country[] = COUNTRIES.filter(c => {
        if (selectedSet.has(c.code)) return false
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    })

    const addCountry = (code: string) => {
        if (!selectedSet.has(code)) {
            onChange([...value, code])
        }
        setSearch('')
        inputRef.current?.focus()
    }

    const removeCountry = (code: string) => {
        onChange(value.filter(c => c !== code))
    }

    const selectedCountries = value
        .map(code => COUNTRIES.find(c => c.code === code.toUpperCase()) ?? { code: code.toUpperCase(), name: code.toUpperCase() })

    return (
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

            {/* Selected country tags */}
            {selectedCountries.length > 0 && (
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '0.375rem',
                    padding: '0.375rem', background: 'var(--bg-subtle)', borderRadius: '6px',
                    border: '1px solid var(--border)',
                }}>
                    {selectedCountries.map(c => (
                        <span
                            key={c.code}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.1875rem 0.375rem 0.1875rem 0.5rem',
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: '4px', fontSize: '0.8125rem',
                                color: 'var(--text-primary)',
                            }}
                        >
                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{countryFlag(c.code)}</span>
                            <span>{c.name}</span>
                            <span
                                onClick={() => removeCountry(c.code)}
                                style={{
                                    marginLeft: '0.125rem', cursor: 'pointer',
                                    color: 'var(--text-muted)', fontSize: '0.875rem',
                                    lineHeight: 1, padding: '0 0.125rem',
                                }}
                                title={`Remove ${c.name}`}
                            >
                                ×
                            </span>
                        </span>
                    ))}
                </div>
            )}

            {/* Search / open trigger */}
            <div style={{ position: 'relative' }}>
                <input
                    ref={inputRef}
                    className="input"
                    style={{ paddingLeft: '2rem' }}
                    placeholder="Search countries to add…"
                    value={search}
                    onFocus={() => setOpen(true)}
                    onChange={e => { setSearch(e.target.value); setOpen(true) }}
                    onKeyDown={e => {
                        if (e.key === 'Escape') { setOpen(false); setSearch('') }
                        if (e.key === 'Enter' && filtered.length === 1) {
                            e.preventDefault()
                            addCountry(filtered[0].code)
                        }
                    }}
                />
                {/* Search icon */}
                <span style={{
                    position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '0.875rem',
                }}>
                    🔍
                </span>
            </div>

            {/* Dropdown list */}
            {open && (
                <div style={{
                    position: 'relative', zIndex: 50,
                    border: '1px solid var(--border)', borderRadius: '6px',
                    background: 'var(--surface)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    maxHeight: '260px', overflowY: 'auto',
                }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {search ? 'No countries match your search.' : 'All countries are already selected.'}
                        </div>
                    ) : (
                        filtered.map(c => (
                            <button
                                key={c.code}
                                type="button"
                                onClick={() => addCountry(c.code)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                                    width: '100%', padding: '0.5rem 0.875rem',
                                    background: 'transparent', border: 'none',
                                    textAlign: 'left', cursor: 'pointer',
                                    fontSize: '0.875rem', color: 'var(--text-primary)',
                                    borderBottom: '1px solid var(--border)',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <span style={{ fontSize: '1.125rem', lineHeight: 1, flexShrink: 0 }}>
                                    {countryFlag(c.code)}
                                </span>
                                <span style={{ flex: 1 }}>{c.name}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {c.code}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
