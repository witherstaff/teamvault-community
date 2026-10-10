'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
    EnvCheckResponse,
    EnvCheckTabProps,
    EnvVarRequirement,
    EnvVarStatus,
    EnvVarItem,
} from './components/env/env-types'
import { createEnvTemplateSnippet } from './components/env/env-utils'
import EnvSummaryBanner from './components/env/EnvSummaryBanner'
import EnvFilterBar from './components/env/EnvFilterBar'
import EnvVarCard from './components/env/EnvVarCard'

export type { EnvVarRequirement, EnvVarStatus, EnvVarItem, EnvCheckResponse }

export default function EnvCheckTab({
    onSummaryLoaded,
    apiEndpoint = '/api/master-admin/env-check',
    showCommercialScope,
}: EnvCheckTabProps) {
    const isCommercial = showCommercialScope !== undefined
        ? showCommercialScope
        : (typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_COMMERCIAL_MODE === 'true' || process.env.COMMERCIAL_MODE === 'true'))

    const [scope, setScope] = useState<'community' | 'commercial' | 'all'>('community')
    const [data, setData] = useState<EnvCheckResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'needs_attention' | 'required' | 'configured' | 'optional'>('all')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')

    const [copiedVar, setCopiedVar] = useState<string | null>(null)
    const [copiedSnippet, setCopiedSnippet] = useState(false)
    const [expandedVars, setExpandedVars] = useState<Set<string>>(new Set())

    const loadEnvCheck = async (targetScope: 'community' | 'commercial' | 'all' = scope) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${apiEndpoint}?scope=${targetScope}`)
            if (res.status === 401) throw new Error('Unauthorized. Please log in.')
            if (res.status === 403) throw new Error('Access denied or feature is disabled.')
            if (!res.ok) throw new Error(`Server returned ${res.status}`)

            const json: EnvCheckResponse = await res.json()
            setData(json)
            if (onSummaryLoaded && targetScope === 'community') {
                onSummaryLoaded(json.summary)
            }

            // By default, automatically expand all missing or placeholder variables for immediate visibility
            const toExpand = new Set<string>()
            json.variables.forEach(v => {
                if (v.status === 'missing' || v.status === 'placeholder') {
                    toExpand.add(v.name)
                }
            })
            setExpandedVars(toExpand)
        } catch (err: any) {
            setError(err.message || 'Failed to audit environment variables')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadEnvCheck(scope)
    }, [scope]) // eslint-disable-line react-hooks/exhaustive-deps

    const toggleExpand = (name: string) => {
        setExpandedVars(prev => {
            const next = new Set(prev)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            return next
        })
    }

    const expandAll = () => {
        if (!data) return
        setExpandedVars(new Set(data.variables.map(v => v.name)))
    }

    const collapseAll = () => {
        setExpandedVars(new Set())
    }

    const handleCopy = (text: string, varName: string) => {
        navigator.clipboard.writeText(text)
        setCopiedVar(varName)
        setTimeout(() => setCopiedVar(null), 2000)
    }

    const handleCopyMissingSnippet = () => {
        if (!data) return
        const attentionVars = data.variables.filter(v => v.status === 'missing' || v.status === 'placeholder')
        if (attentionVars.length === 0) return

        const snippet = createEnvTemplateSnippet(scope, attentionVars)
        navigator.clipboard.writeText(snippet)
        setCopiedSnippet(true)
        setTimeout(() => setCopiedSnippet(false), 2500)
    }

    const filteredVars = useMemo(() => {
        if (!data) return []
        return data.variables.filter(v => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim()
                const matchesName = v.name.toLowerCase().includes(q)
                const matchesDesc = v.description.toLowerCase().includes(q)
                const matchesService = v.service.toLowerCase().includes(q)
                const matchesCat = v.category.toLowerCase().includes(q)
                if (!matchesName && !matchesDesc && !matchesService && !matchesCat) return false
            }

            if (categoryFilter !== 'all' && v.category !== categoryFilter) {
                return false
            }

            if (statusFilter === 'needs_attention') {
                return v.status === 'missing' || v.status === 'placeholder'
            }
            if (statusFilter === 'required') {
                return v.requirement === 'required'
            }
            if (statusFilter === 'configured') {
                return v.status === 'configured'
            }
            if (statusFilter === 'optional') {
                return v.requirement === 'optional'
            }

            return true
        })
    }, [data, searchQuery, statusFilter, categoryFilter])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Scope Switcher: Only displayed in Commercial deployments */}
            {isCommercial && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        background: 'var(--surface)',
                        padding: '0.75rem 1.25rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Configuration Scope:
                        </span>
                        <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            <button
                                onClick={() => {
                                    setScope('community')
                                    setCategoryFilter('all')
                                }}
                                style={{
                                    padding: '0.35rem 0.85rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms',
                                    background: scope === 'community' ? 'var(--surface)' : 'transparent',
                                    color: scope === 'community' ? 'var(--text-primary)' : 'var(--text-muted)',
                                    boxShadow: scope === 'community' ? 'var(--shadow-sm)' : 'none',
                                }}
                            >
                                Community Edition (Core Platform)
                            </button>
                            <button
                                onClick={() => {
                                    setScope('commercial')
                                    setCategoryFilter('all')
                                }}
                                style={{
                                    padding: '0.35rem 0.85rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms',
                                    background: scope === 'commercial' ? 'var(--surface)' : 'transparent',
                                    color: scope === 'commercial' ? 'var(--accent)' : 'var(--text-muted)',
                                    boxShadow: scope === 'commercial' ? 'var(--shadow-sm)' : 'none',
                                }}
                            >
                                Commercial Add-ons (Stripe & Agents)
                            </button>
                            <button
                                onClick={() => {
                                    setScope('all')
                                    setCategoryFilter('all')
                                }}
                                style={{
                                    padding: '0.35rem 0.85rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms',
                                    background: scope === 'all' ? 'var(--surface)' : 'transparent',
                                    color: scope === 'all' ? 'var(--accent)' : 'var(--text-muted)',
                                    boxShadow: scope === 'all' ? 'var(--shadow-sm)' : 'none',
                                }}
                            >
                                All Variables
                            </button>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {scope === 'community'
                            ? 'Auditing self-hosted core variables (Auth0, Supabase, S3 Storage, App).'
                            : scope === 'commercial'
                            ? 'Commercial variables: Stripe SaaS billing and Autonomous Agent Base/USDC.'
                            : 'Combined view of all Core Community and Commercial Extension variables.'}
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Auditing {scope === 'community' ? 'Community' : 'Commercial'} Environment Variables…
                    </div>
                    <div className="text-muted text-sm">
                        {scope === 'community'
                            ? 'Checking Auth0, Supabase, Storage provider, and application configurations'
                            : 'Checking Stripe API credentials, price IDs, and Base blockchain RPC config'}
                    </div>
                </div>
            ) : error || !data ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--error)' }}>
                    <div style={{ color: 'var(--error)', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                        Environment Audit Failed
                    </div>
                    <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
                        {error || 'Unable to load environment configuration.'}
                    </p>
                    <button onClick={() => loadEnvCheck(scope)} className="btn btn-secondary">
                        Retry Audit
                    </button>
                </div>
            ) : (
                <>
                    <EnvSummaryBanner
                        data={data}
                        scope={scope}
                        copiedSnippet={copiedSnippet}
                        onFilterNeedsAttention={() => setStatusFilter('needs_attention')}
                        onCopySnippet={handleCopyMissingSnippet}
                        onSelectVar={(name) => {
                            setSearchQuery(name)
                            setStatusFilter('all')
                            setExpandedVars(prev => new Set(prev).add(name))
                        }}
                        onRefresh={() => loadEnvCheck(scope)}
                    />

                    <EnvFilterBar
                        data={data}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        categoryFilter={categoryFilter}
                        onCategoryFilterChange={setCategoryFilter}
                        onExpandAll={expandAll}
                        onCollapseAll={collapseAll}
                        onRefresh={() => loadEnvCheck(scope)}
                    />

                    {filteredVars.length === 0 ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No environment variables matched your search and filter criteria.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredVars.map(v => (
                                <EnvVarCard
                                    key={v.name}
                                    v={v}
                                    isExpanded={expandedVars.has(v.name)}
                                    onToggle={() => toggleExpand(v.name)}
                                    copiedVar={copiedVar}
                                    onCopy={handleCopy}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
