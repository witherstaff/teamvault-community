'use client'

import React from 'react'
import { EnvCheckResponse } from './env-types'

interface EnvFilterBarProps {
    data: EnvCheckResponse
    searchQuery: string
    onSearchChange: (q: string) => void
    statusFilter: 'all' | 'needs_attention' | 'required' | 'configured' | 'optional'
    onStatusFilterChange: (s: 'all' | 'needs_attention' | 'required' | 'configured' | 'optional') => void
    categoryFilter: string
    onCategoryFilterChange: (c: string) => void
    onExpandAll: () => void
    onCollapseAll: () => void
    onRefresh: () => void
}

export default function EnvFilterBar({
    data,
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    categoryFilter,
    onCategoryFilterChange,
    onExpandAll,
    onCollapseAll,
    onRefresh,
}: EnvFilterBarProps) {
    return (
        <div
            className="card"
            style={{
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
            }}
        >
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Search Input */}
                <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 420 }}>
                    <input
                        type="text"
                        placeholder="Search by variable name, service, or keyword…"
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            outline: 'none',
                        }}
                    />
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-muted)"
                        strokeWidth="2"
                        style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Quick Expand / Collapse & Refresh Controls */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        onClick={onExpandAll}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                    >
                        Expand All
                    </button>
                    <button
                        onClick={onCollapseAll}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                    >
                        Collapse All
                    </button>
                    <button
                        onClick={onRefresh}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                        ↻ Refresh Check
                    </button>
                </div>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                {/* Status filter pills */}
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => onStatusFilterChange('all')}
                        className={statusFilter === 'all' ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                    >
                        All ({data.variables.length})
                    </button>
                    <button
                        onClick={() => onStatusFilterChange('needs_attention')}
                        className={statusFilter === 'needs_attention' ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.65rem',
                            color: data.summary.requiredMissingCount > 0 ? 'var(--error)' : undefined,
                            borderColor: data.summary.requiredMissingCount > 0 ? 'var(--error)' : undefined,
                        }}
                    >
                        Needs Attention ({data.summary.requiredMissingCount})
                    </button>
                    <button
                        onClick={() => onStatusFilterChange('required')}
                        className={statusFilter === 'required' ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                    >
                        Required ({data.summary.requiredTotal})
                    </button>
                    <button
                        onClick={() => onStatusFilterChange('configured')}
                        className={statusFilter === 'configured' ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                    >
                        Configured ({data.summary.requiredConfigured + data.summary.optionalConfigured})
                    </button>
                    <button
                        onClick={() => onStatusFilterChange('optional')}
                        className={statusFilter === 'optional' ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                    >
                        Optional ({data.summary.optionalTotal})
                    </button>
                </div>

                {/* Category Dropdown */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category:</span>
                    <select
                        value={categoryFilter}
                        onChange={e => onCategoryFilterChange(e.target.value)}
                        style={{
                            fontSize: '0.8rem',
                            padding: '0.3rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                        }}
                    >
                        <option value="all">All Categories ({data.categories.length})</option>
                        {data.categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
}
