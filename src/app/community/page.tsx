import type { Metadata } from 'next'
import CommunityPageClient from './CommunityPageClient'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.teamvault.cloud'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'TeamVault Community Edition — Self-Hosted Secure Team File Vault',
  description:
    'TeamVault Community is the source-available, self-hosted edition of TeamVault, with unlimited users, controlled access, verified downloads, and complete audit history.',
  keywords: [
    'teamvault community edition',
    'self hosted team file vault',
    'private team file storage',
    'source-available file vault',
    'role-based access control file sharing',
    'unlimited users self hosted storage',
    'secure document management',
    'PDF watermarking software',
    'verified file downloads',
    'tamper resistant audit log',
    's3 compatible team drive',
  ],
  authors: [{ name: 'TeamVault' }],
  creator: 'TeamVault',
  publisher: 'TeamVault',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: `${APP_URL}/community`,
  },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/community`,
    siteName: 'TeamVault Community Edition',
    title: 'TeamVault Community Edition — Self-Hosted Secure Team File Vault',
    description:
      'TeamVault Community is the source-available, self-hosted edition of TeamVault, with unlimited users, controlled access, verified downloads, and complete audit history.',
    images: [
      {
        url: `${APP_URL}/images/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'TeamVault Community Edition',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TeamVault Community Edition — Self-Hosted Secure Team File Vault',
    description:
      'Self-hosted secure file sharing for teams. Unlimited users, verified downloads, and tamper-resistant audit history.',
    images: [`${APP_URL}/images/og-image.png`],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${APP_URL}/community#software`,
      name: 'TeamVault Community Edition',
      url: `${APP_URL}/community`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Windows, macOS, Linux',
      description:
        'Self-hosted secure team file vault with role-based access control, PDF watermarking, verified downloads, desktop sync, and complete forensic audit logging.',
      featureList: [
        'Self-hosted on any S3-compatible storage',
        'Unlimited users with no per-seat licensing',
        'Role-based access control and folder permissions',
        'Dynamic PDF watermarking with downloader identity',
        'Verified downloads with email and IP restrictions',
        'Complete forensic audit logs',
        'Desktop sync for Windows, macOS, and Linux',
        'Temporary 120-second download tokens',
      ],
      publisher: {
        '@type': 'Organization',
        name: 'TeamVault',
        url: APP_URL,
      },
    },
  ],
}

export default function CommunityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CommunityPageClient />
    </>
  )
}
