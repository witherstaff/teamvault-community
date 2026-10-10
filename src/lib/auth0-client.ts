import { Auth0Client } from '@auth0/nextjs-auth0/server'

let _auth0: Auth0Client | null = null

export function getResolvedAuth0Options() {
    // 1. Resolve domain:
    let domain = process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL
    if (domain) {
        domain = domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim()
    }

    // 2. Resolve appBaseUrl:
    // Auth0 v4 expects APP_BASE_URL, while v3 and common conventions use AUTH0_BASE_URL or NEXT_PUBLIC_APP_URL
    let appBaseUrl =
        process.env.APP_BASE_URL ||
        process.env.AUTH0_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL

    if (!appBaseUrl && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        appBaseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    } else if (!appBaseUrl && process.env.VERCEL_URL) {
        appBaseUrl = `https://${process.env.VERCEL_URL}`
    }

    if (appBaseUrl) {
        appBaseUrl = appBaseUrl.trim()
        if (!appBaseUrl.startsWith('http://') && !appBaseUrl.startsWith('https://')) {
            appBaseUrl = `https://${appBaseUrl}`
        }
        appBaseUrl = appBaseUrl.replace(/\/+$/, '')
    }

    return {
        ...(domain ? { domain } : {}),
        ...(appBaseUrl ? { appBaseUrl } : {}),
        ...(process.env.AUTH0_CLIENT_ID ? { clientId: process.env.AUTH0_CLIENT_ID.trim() } : {}),
        ...(process.env.AUTH0_CLIENT_SECRET ? { clientSecret: process.env.AUTH0_CLIENT_SECRET.trim() } : {}),
        ...(process.env.AUTH0_SECRET ? { secret: process.env.AUTH0_SECRET.trim() } : {}),
    }
}

export function getAuth0(): Auth0Client {
    if (!_auth0) {
        const options = getResolvedAuth0Options()
        _auth0 = new Auth0Client(Object.keys(options).length > 0 ? options : undefined)
    }
    return _auth0
}
