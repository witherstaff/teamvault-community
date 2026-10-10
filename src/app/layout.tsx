import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Auth0Provider } from '@auth0/nextjs-auth0/client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.teamvault.cloud'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'TeamVault — Secure Team File Vault',
    template: '%s | TeamVault',
  },
  description:
    'Secure team file vault with role-based access control, PDF watermarking, and complete audit logs. Flat-rate pricing — unlimited users.',
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Auth0Provider>
          {children}
        </Auth0Provider>
      </body>
    </html>
  )
}
