import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Install Check — TeamVault Community Edition',
    description: 'Self-hosted environment variable diagnostics and installation checker for TeamVault.',
    robots: {
        index: false,
        follow: false,
    },
}

export default function InstallCheckLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
