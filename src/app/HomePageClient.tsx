'use client'

import React, { useEffect, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingFeatures } from '@/components/landing/LandingFeatures'
import { LandingPricing } from '@/components/landing/LandingPricing'
import { LandingSecurity } from '@/components/landing/LandingSecurity'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { CommunityArchitecture } from '@/components/landing/CommunityArchitecture'
import { SelfHostSection } from '@/components/landing/SelfHostSection'
import { CloudPitchSection } from '@/components/landing/CloudPitchSection'

interface HomePageClientProps {
  isCommercial?: boolean
}

export default function HomePageClient({ isCommercial: initialCommercial }: HomePageClientProps = {}) {
  const isCommercial = initialCommercial ?? (
    process.env.NEXT_PUBLIC_COMMERCIAL_MODE === 'true' ||
    process.env.COMMERCIAL_MODE === 'true'
  )
  const { user, isLoading } = useUser()
  const router = useRouter()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const startTrial = () => {
    localStorage.setItem('tv_trial_intent', '1')
    window.location.href = '/auth/login?returnTo=/vault'
  }

  const startCheckout = async (planId: string) => {
    if (!isCommercial) {
      window.location.href = '/auth/login?returnTo=/vault'
      return
    }

    if (checkoutLoading) return
    setCheckoutLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`)
      if (data.url) window.location.href = data.url
    } catch (e: any) {
      console.error('Checkout error:', e)
      alert(e.message || 'Failed to start checkout. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

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
      <LandingNav user={user} onStartTrial={startTrial} isCommercial={isCommercial} />
      <LandingHero user={user} onStartTrial={startTrial} isCommercial={isCommercial} />
      <LandingFeatures isCommercial={isCommercial} />
      {isCommercial ? (
        <LandingPricing checkoutLoading={checkoutLoading} onStartCheckout={startCheckout} isCommercial={true} />
      ) : (
        <CommunityArchitecture />
      )}
      <LandingSecurity />
      <SelfHostSection />
      {!isCommercial && <CloudPitchSection />}
      <LandingFooter user={user} onStartTrial={startTrial} isCommercial={isCommercial} />
    </div>
  )
}
