'use client'

import React from 'react'
import { EnvVarItem } from './env-types'

interface EnvVarCardProps {
    v: EnvVarItem
    isExpanded: boolean
    onToggle: () => void
    copiedVar: string | null
    onCopy: (text: string, varName: string) => void
}

export default function EnvVarCard({
    v,
    isExpanded,
    onToggle,
    copiedVar,
    onCopy,
}: EnvVarCardProps) {
    const isMissing = v.status === 'missing'
    const isPlaceholder = v.status === 'placeholder'
    const isConfigured = v.status === 'configured'

    let cardBorderColor = 'var(--border)'
    let cardBg = 'var(--surface)'

    if (isMissing) {
        cardBorderColor = 'var(--error)'
        cardBg = 'color-mix(in srgb, var(--error) 4%, var(--surface))'
    } else if (isPlaceholder) {
        cardBorderColor = 'var(--warning)'
        cardBg = 'color-mix(in srgb, var(--warning) 4%, var(--surface))'
    }

    return (
        <div
            className="card"
            style={{
                border: `1.5px solid ${cardBorderColor}`,
                background: cardBg,
                borderRadius: 'var(--radius)',
                transition: 'all 150ms ease',
                boxShadow: isMissing ? '0 0 0 1px var(--error)' : 'var(--shadow-sm)',
                overflow: 'hidden',
            }}
        >
            {/* Header / Summary Row */}
            <div
                onClick={onToggle}
                style={{
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    gap: '1rem',
                    userSelect: 'none',
                }}
            >
                {/* Left: Status Icon + Variable Name + Category */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                    {isConfigured && (
                        <div
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: 'color-mix(in srgb, var(--success) 15%, transparent)',
                                color: 'var(--success)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                flexShrink: 0,
                            }}
                            title="Configured"
                        >
                            ✓
                        </div>
                    )}
                    {isMissing && (
                        <div
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: 'var(--error)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                flexShrink: 0,
                                boxShadow: '0 0 8px rgba(220, 38, 38, 0.4)',
                            }}
                            title="Required Variable Missing!"
                        >
                            !
                        </div>
                    )}
                    {isPlaceholder && (
                        <div
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: 'var(--warning)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                flexShrink: 0,
                            }}
                            title="Placeholder Detected"
                        >
                            ⚠
                        </div>
                    )}
                    {v.status === 'optional_missing' && (
                        <div
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: 'var(--border)',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                flexShrink: 0,
                            }}
                            title="Optional (Not Configured)"
                        >
                            -
                        </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                                className="mono"
                                style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    color: isMissing ? 'var(--error)' : 'var(--text-primary)',
                                }}
                            >
                                {v.name}
                            </span>

                            {/* Copy Name Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onCopy(v.name, v.name)
                                }}
                                className="btn btn-ghost"
                                style={{
                                    padding: '0.15rem 0.4rem',
                                    fontSize: '0.7rem',
                                    color: copiedVar === v.name ? 'var(--success)' : 'var(--text-muted)',
                                }}
                                title="Copy variable name"
                            >
                                {copiedVar === v.name ? 'Copied!' : 'Copy'}
                            </button>

                            {/* Requirement Tag */}
                            <span
                                style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    background: v.requirement === 'required'
                                        ? 'color-mix(in srgb, var(--error) 15%, transparent)'
                                        : 'color-mix(in srgb, var(--accent) 15%, transparent)',
                                    color: v.requirement === 'required' ? 'var(--error)' : 'var(--accent)',
                                }}
                            >
                                {v.requirement}
                            </span>

                            {/* Service Tag */}
                            <span
                                style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    background: 'var(--bg-subtle)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                {v.service}
                            </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.description}
                        </div>
                    </div>
                </div>

                {/* Right: Status Pill & Value Preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <div>
                        {isConfigured && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 4, background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' }}>
                                CONFIGURED
                            </span>
                        )}
                        {isMissing && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 4, background: 'var(--error)', color: '#FFFFFF' }}>
                                MISSING (ACTION REQUIRED)
                            </span>
                        )}
                        {isPlaceholder && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 4, background: 'var(--warning)', color: '#FFFFFF' }}>
                                PLACEHOLDER VALUE
                            </span>
                        )}
                        {v.status === 'optional_missing' && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 500, padding: '0.2rem 0.6rem', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                NOT SET (OPTIONAL)
                            </span>
                        )}
                    </div>

                    <span
                        style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 150ms ease',
                        }}
                    >
                        ▼
                    </span>
                </div>
            </div>

            {/* Expanded Details Section */}
            {isExpanded && (
                <div
                    style={{
                        borderTop: '1px solid var(--border)',
                        padding: '1.25rem',
                        background: 'var(--bg-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        fontSize: '0.85rem',
                    }}
                >
                    {/* Current Value Box */}
                    <div
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                        }}
                    >
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.5rem' }}>
                                Current Runtime Value:
                            </span>
                            {v.isSet ? (
                                <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {v.maskedValue}
                                </span>
                            ) : isPlaceholder ? (
                                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                                    ⚠️ Set to placeholder: {v.maskedValue}
                                </span>
                            ) : (
                                <span style={{ color: 'var(--error)', fontWeight: 600 }}>
                                    Not defined in process.env
                                </span>
                            )}
                        </div>

                        {v.isSecret && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                🔒 Secret (masked for security)
                            </span>
                        )}
                    </div>

                    {/* Conditional explanation banner if applicable */}
                    {v.conditionReason && (
                        <div
                            style={{
                                padding: '0.6rem 0.85rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'color-mix(in srgb, var(--accent) 10%, var(--surface))',
                                border: '1px solid var(--accent)',
                                fontSize: '0.8rem',
                                color: 'var(--accent-text)',
                            }}
                        >
                            <strong>Condition Rule:</strong> {v.conditionReason}
                        </div>
                    )}

                    {/* 2-Column Grid: Why Needed & How To Obtain */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                        <div
                            style={{
                                padding: '1rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                Why this variable is required:
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {v.whyNeeded}
                            </p>
                        </div>

                        <div
                            style={{
                                padding: '1rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                How to obtain / generate:
                            </div>
                            <p style={{ margin: '0 0 0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {v.howToGet}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <a
                                    href={v.signUpUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary"
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '0.35rem 0.75rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                    }}
                                >
                                    <span>{v.signUpLabel}</span>
                                    <span>↗</span>
                                </a>

                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Console / Dashboard
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Example Format Block with Quick Copy */}
                    <div
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface)',
                            border: '1px dashed var(--border-strong)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.5rem' }}>
                                Example format:
                            </span>
                            <code className="mono" style={{ fontSize: '0.8rem', background: 'var(--bg-subtle)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>
                                {v.name}={v.example}
                            </code>
                        </div>

                        <button
                            onClick={() => onCopy(`${v.name}=${v.example}`, `${v.name}_example`)}
                            className="btn btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        >
                            {copiedVar === `${v.name}_example` ? '✓ Copied Example' : 'Copy Example .env Line'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
