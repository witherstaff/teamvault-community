import React from 'react'
import { STORAGE_PLANS } from '@/lib/config'

export const INTERNAL_PLANS = STORAGE_PLANS.filter(p => p.internal)

// ── Types ─────────────────────────────────────────────────────────

export type DayStat = { date: string; count: number }

export type Stats = {
    totals: { workspaces: number; users: number; files: number; storageBytes: number }
    planBreakdown: Record<string, number>
    uniqueActiveUsers: number
    dailyActiveUsers: DayStat[]
    dailyUploads: DayStat[]
    dailyVerifiedDownloads: DayStat[]
    dailyNewWorkspaces: DayStat[]
}

export type Workspace = {
    id: string
    name: string
    plan_id: string
    storage_used_bytes: number
    storage_limit_bytes: number
    created_at: string
}

export type WorkspaceMember = {
    id: string
    email: string
    name: string | null
    role: 'admin' | 'user'
    can_upload: boolean
    status: 'invited' | 'active' | 'disabled'
    joined_at: string
}

// ── Helpers ───────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
}

export function formatDate(iso: string): string {
    const [, month, day] = iso.split('-')
    return `${month}/${day}`
}

// ── Shared UI ─────────────────────────────────────────────────────

export function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 150ms',
            }}
        >
            {label}
        </button>
    )
}

export function MiniBar({ value, max, color = 'var(--accent)' }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 20, textAlign: 'right' }}>{value}</span>
        </div>
    )
}

export const PLAN_COLORS: Record<string, string> = {
    starter: 'var(--text-secondary)',
    growth: 'var(--accent)',
    scale: '#7c3aed',
    custom: '#059669',
    internal: '#0891b2',
    'internal-large': '#0e7490',
    canceled: 'var(--error)',
}

export function PlanBadge({ planId }: { planId: string }) {
    const color = PLAN_COLORS[planId] ?? 'var(--text-muted)'
    return (
        <span
            style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                color,
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
            }}
        >
            {planId}
        </span>
    )
}
