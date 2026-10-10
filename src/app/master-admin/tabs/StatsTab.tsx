'use client'

import React from 'react'
import { DayStat, Stats, formatBytes, formatDate, MiniBar, PlanBadge, PLAN_COLORS } from '../components/shared'

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                {label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{sub}</div>}
        </div>
    )
}

export function DailyChart({ data, color, label, periodTotal }: { data: DayStat[]; color: string; label: string; periodTotal?: number }) {
    const max = Math.max(...data.map(d => d.count), 1)
    const total = periodTotal ?? data.reduce((s, d) => s + d.count, 0)
    const today = data[data.length - 1]?.count ?? 0
    return (
        <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 14 days</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{today}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>today · {total} total</div>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {data.map(d => (
                    <div key={d.date} style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>{formatDate(d.date)}</span>
                        <MiniBar value={d.count} max={max} color={color} />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function StatsTab({ stats, onRefresh, refreshed }: { stats: Stats; onRefresh: () => void; refreshed: Date | null }) {
    const planEntries = Object.entries(stats.planBreakdown).sort((a, b) => b[1] - a[1])
    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard label="Workspaces" value={stats.totals.workspaces} />
                <StatCard label="Total Users" value={stats.totals.users} />
                <StatCard label="Total Files" value={stats.totals.files.toLocaleString()} />
                <StatCard label="Storage Used" value={formatBytes(stats.totals.storageBytes)} sub="across all workspaces" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Workspaces by Plan</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {planEntries.map(([plan, count]) => (
                            <div key={plan} style={{ display: 'grid', gridTemplateColumns: '8rem 1fr', alignItems: 'center', gap: '0.75rem' }}>
                                <PlanBadge planId={plan} />
                                <MiniBar value={count} max={stats.totals.workspaces} color={PLAN_COLORS[plan] ?? 'var(--accent)'} />
                            </div>
                        ))}
                        {planEntries.length === 0 && <span className="text-muted text-sm">No workspaces</span>}
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Today at a Glance</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[
                            { label: 'Active users', value: stats.dailyActiveUsers.at(-1)?.count ?? 0, color: 'var(--accent)' },
                            { label: 'File uploads', value: stats.dailyUploads.at(-1)?.count ?? 0, color: '#059669' },
                            { label: 'Verified downloads', value: stats.dailyVerifiedDownloads.at(-1)?.count ?? 0, color: '#7c3aed' },
                            { label: 'New workspaces', value: stats.dailyNewWorkspaces.at(-1)?.count ?? 0, color: '#d97706' },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                <span style={{ fontWeight: 700, fontSize: '1.125rem', color }}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <DailyChart data={stats.dailyActiveUsers} color="var(--accent)" label="Active Users per Day" periodTotal={stats.uniqueActiveUsers} />
                <DailyChart data={stats.dailyVerifiedDownloads} color="#7c3aed" label="Verified Downloads per Day" />
                <DailyChart data={stats.dailyUploads} color="#059669" label="File Uploads per Day" />
                <DailyChart data={stats.dailyNewWorkspaces} color="#d97706" label="New Workspaces per Day" />
            </div>
        </>
    )
}
