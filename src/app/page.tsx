import type { Metadata } from 'next'
import HomePageClient from './HomePageClient'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.teamvault.cloud'

function isCommercialMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_COMMERCIAL_MODE === 'true' ||
    process.env.COMMERCIAL_MODE === 'true' ||
    Boolean(process.env.STRIPE_SECRET_KEY)
  )
}

const commercialMetadata: Metadata = {
      metadataBase: new URL(APP_URL),
      title: 'TeamVault — Secure File Sharing Without Per-User Pricing',
      description:
        'Secure team file sharing from $25/month. Unlimited users, controlled access, verified downloads, and a complete audit history. Pay for storage, not seats.',
      keywords: [
        'secure team file vault',
        'team file storage',
        'role-based access control file sharing',
        'flat rate file storage unlimited users',
        'secure document management',
        'PDF watermarking software',
        'verified file downloads',
        'team document vault',
        'secure file sharing for teams',
        'audit log file sharing',
        'no per seat file storage',
        'team file permissions',
        'encrypted file storage teams',
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
        canonical: APP_URL,
      },
      openGraph: {
        type: 'website',
        url: APP_URL,
        siteName: 'TeamVault',
        title: 'TeamVault — Secure File Sharing Without Per-User Pricing',
        description:
          'Unlimited users, controlled access, verified downloads, and complete audit history from $25/month. Pay for storage, not seats.',
        images: [
          {
            url: `${APP_URL}/images/og-image.png`,
            width: 1200,
            height: 630,
            alt: 'TeamVault — Secure Team File Vault',
          },
        ],
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'TeamVault — Secure File Sharing Without Per-User Pricing',
        description:
          'Secure file sharing for teams from $25/month. Unlimited users, verified downloads, and tamper-resistant audit history. Pay for storage, not seats.',
        images: [`${APP_URL}/images/og-image.png`],
      },
    }

const communityMetadata: Metadata = {
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
        canonical: APP_URL,
      },
      openGraph: {
        type: 'website',
        url: APP_URL,
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

const commercialJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'TeamVault',
      url: APP_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${APP_URL}/images/teamvault-shield-name.png`,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: 'TeamVault',
      publisher: { '@id': `${APP_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${APP_URL}/#software`,
      name: 'TeamVault',
      url: APP_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Windows, macOS, Linux',
      description:
        'Secure team file vault with role-based access control, PDF watermarking, verified downloads, desktop sync, and complete audit logging. Flat-rate pricing — unlimited users.',
      offers: [
        {
          '@type': 'Offer',
          name: 'Team',
          price: '25.00',
          priceCurrency: 'USD',
          priceSpecification: { '@type': 'UnitPriceSpecification', price: '25.00', priceCurrency: 'USD', unitText: 'MONTH' },
          description: 'Team file security for $25/month. Unlimited users. 1 TB included. Role-based access, 100 verified downloads/mo, 90-day audit history.',
        },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: '99.00',
          priceCurrency: 'USD',
          priceSpecification: { '@type': 'UnitPriceSpecification', price: '99.00', priceCurrency: 'USD', unitText: 'MONTH' },
          description: 'Secure file collaboration for growing teams. Unlimited users, 5 TB storage, more verified downloads, and extended audit history.',
        },
        {
          '@type': 'Offer',
          name: 'Business',
          price: '199.00',
          priceCurrency: 'USD',
          priceSpecification: { '@type': 'UnitPriceSpecification', price: '199.00', priceCurrency: 'USD', unitText: 'MONTH' },
          description: 'Advanced file security for organizations that need higher limits, long-term auditability, and priority support.',
        },
        {
          '@type': 'Offer',
          name: 'Enterprise',
          description: 'Custom capacity, dedicated infrastructure, and tailored SLAs for large organizations. Contact TeamVault to discuss.',
        },
      ],
      featureList: [
        'Role-based access control',
        'PDF watermarking with downloader identity',
        'Verified downloads with email and IP restrictions',
        'Complete forensic audit logs',
        'Desktop sync for Windows, macOS, and Linux',
        'Temporary 120-second download tokens',
        'Folder-level permission inheritance',
        'AES-256 encrypted storage',
      ],
      publisher: { '@id': `${APP_URL}/#organization` },
    },
  ],
}

const communityJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'TeamVault Community Edition',
      url: APP_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${APP_URL}/images/teamvault-shield-name.png`,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: 'TeamVault Community Edition',
      publisher: { '@id': `${APP_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${APP_URL}/#software`,
      name: 'TeamVault Community Edition',
      url: APP_URL,
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
      publisher: { '@id': `${APP_URL}/#organization` },
    },
  ],
}

export function generateMetadata(): Metadata {
  return isCommercialMode() ? commercialMetadata : communityMetadata
}

export default function HomePage() {
  const isCommercial = isCommercialMode()
  const jsonLd = isCommercial ? commercialJsonLd : communityJsonLd

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient isCommercial={isCommercial} />
    </>
  )
}
