'use client'

import React from 'react'
import { EnvCheckResponse } from './env-types'

interface EnvSummaryBannerProps {
    data: EnvCheckResponse
    scope: 'community' | 'commercial' | 'all'
    copiedSnippet: boolean
    onFilterNeedsAttention: () => void
    onCopySnippet: () => void
    onSelectVar: (name: string) => void
    onRefresh: () => void
}

export default function EnvSummaryBanner({
    data,
    scope,
    copiedSnippet,
    onFilterNeedsAttention,
    onCopySnippet,
    onSelectVar,
    onRefresh,
}: EnvSummaryBannerProps) {
    const isActionRequired = data.summary.requiredMissingCount > 0 || (!data.summary.storageResult.ok && scope === 'community')

    return (
        <>
            {/* ── High-Priority Status Alert Banner ─────────────────────── */}
            {isActionRequired ? (
                <div
                    style={{
                        padding: '1.25rem 1.5rem',
                        borderRadius: 'var(--radius)',
                        background: 'color-mix(in srgb, var(--error) 12%, var(--surface))',
                        border: '1.5px solid var(--error)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'var(--error)',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    flexShrink: 0,
                                }}
                            >
                                !
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--error)' }}>
                                    {scope === 'community' ? 'Community Configuration Action Required' : 'Commercial Configuration Action Required'}
                                </h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {data.summary.requiredMissingCount > 0
                                        ? `${data.summary.requiredMissingCount} required environment variable${data.summary.requiredMissingCount === 1 ? '' : 's'} missing or using placeholder values.`
                                        : 'Storage provider configuration could not be resolved.'}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={onFilterNeedsAttention}
                                className="btn btn-primary"
                                style={{
                                    fontSize: '0.8125rem',
                                    padding: '0.4rem 0.85rem',
                                    backgroundColor: 'var(--error)',
                                    borderColor: 'var(--error)',
                                }}
                            >
                                View Missing Variables ({data.summary.requiredMissingCount})
                            </button>
                            <button
                                onClick={onCopySnippet}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.85rem' }}
                            >
                                {copiedSnippet ? '✓ Copied Template!' : 'Copy .env Snippet'}
                            </button>
                        </div>
                    </div>

                    {/* Quick clickable chips for missing variables */}
                    {data.missingRequiredNames.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', paddingTop: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Missing:
                            </span>
                            {data.missingRequiredNames.map(name => (
                                <button
                                    key={name}
                                    onClick={() => onSelectVar(name)}
                                    style={{
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '4px',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--error)',
                                        color: 'var(--error)',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 150ms',
                                    }}
                                    title="Click to focus on this variable"
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div
                    style={{
                        padding: '1.25rem 1.5rem',
                        borderRadius: 'var(--radius)',
                        background: 'color-mix(in srgb, var(--success) 10%, var(--surface))',
                        border: '1px solid var(--success)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: 'var(--success)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                flexShrink: 0,
                            }}
                        >
                            ✓
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>
                                {scope === 'community' ? 'Community Environment Configuration Healthy' : 'Commercial Environment Configuration Verified'}
                            </h3>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                All {data.summary.requiredTotal} required {scope === 'community' ? 'community' : 'commercial'} environment variables are set and verified.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onRefresh}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8125rem', padding: '0.4rem 0.85rem' }}
                    >
                        Re-verify Now
                    </button>
                </div>
            )}

            {/* ── Summary Stat Metric Cards ────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {/* Required Variables Card */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        {scope === 'community' ? 'Community Required' : 'Commercial Required'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 700, color: data.summary.requiredMissingCount > 0 ? 'var(--error)' : 'var(--success)' }}>
                            {data.summary.requiredConfigured} / {data.summary.requiredTotal}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {data.summary.requiredMissingCount === 0 ? 'All Set' : `${data.summary.requiredMissingCount} missing`}
                        </span>
                    </div>
                    <div style={{ marginTop: '0.75rem', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                            style={{
                                width: data.summary.requiredTotal > 0 ? `${Math.round((data.summary.requiredConfigured / data.summary.requiredTotal) * 100)}%` : '100%',
                                height: '100%',
                                background: data.summary.requiredMissingCount > 0 ? 'var(--error)' : 'var(--success)',
                                transition: 'width 0.4s ease',
                            }}
                        />
                    </div>
                </div>

                {/* Storage Provider Status Card (Community) or Stripe Card (Commercial) */}
                {scope === 'community' ? (
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                            Storage Provider
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                            {data.summary.storageResult.provider || 'Unset'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Bucket: <span className="mono" style={{ fontWeight: 600 }}>{data.summary.storageResult.bucket || 'Not configured'}</span>
                        </div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: data.summary.storageResult.ok ? 'var(--success)' : 'var(--error)',
                                }}
                            />
                            <span style={{ fontSize: '0.75rem', color: data.summary.storageResult.ok ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
                                {data.summary.storageResult.ok ? 'Configuration Valid' : 'Resolution Failed'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                            Stripe SaaS Billing
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                            {data.variables.filter(v => v.category === 'Commercial Billing (Stripe)' && v.isSet).length} / 5
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Keys & Tier Price IDs Configured
                        </div>
                    </div>
                )}

                {/* Optional Variables Card */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Optional Settings
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                            {data.summary.optionalConfigured} / {data.summary.optionalTotal}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Configured</span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {scope === 'community' ? 'Optional cron and email notifications' : 'Autonomous Agent network & Base RPC'}
                    </p>
                </div>

                {/* Total Audit Card */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Audit Metadata
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                        {data.summary.totalChecked} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-muted)' }}>variables</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Last checked: {new Date(data.checkedAt).toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </>
    )
}
