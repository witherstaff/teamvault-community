'use client'

import React, { useEffect } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingFeatures } from '@/components/landing/LandingFeatures'
import { CommunityArchitecture } from '@/components/landing/CommunityArchitecture'
import { SelfHostSection } from '@/components/landing/SelfHostSection'
import { CloudPitchSection } from '@/components/landing/CloudPitchSection'
import { LandingSecurity } from '@/components/landing/LandingSecurity'
import { LandingFooter } from '@/components/landing/LandingFooter'

export default function CommunityPageClient() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !user) return
    const pending = localStorage.getItem('tv_pending_redirect')
    if (pending) {
      localStorage.removeItem('tv_pending_redirect')
      window.location.href = pending
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <Image src="/images/teamvault-shield-name.png" alt="TeamVault Logo" width={180} height={40} style={{ margin: '0 auto 1rem', width: 'auto', height: 40 }} priority />
          <p className="text-muted text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="landing-page">
      <LandingNav user={user} isCommercial={false} />
      <LandingHero user={user} isCommercial={false} />
      <LandingFeatures isCommercial={false} />
      <CommunityArchitecture />
      <LandingSecurity />
      <SelfHostSection />
      <CloudPitchSection />
      <LandingFooter user={user} isCommercial={false} />
    </div>
  )
}
