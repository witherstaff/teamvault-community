import { resolveStorageConfig } from '@/lib/storage-config'
import {
    COMMUNITY_ENV_DEFINITIONS,
    EnvVarDefinition,
    EnvVarRequirement,
    EnvVarStatus,
    isPlaceholder,
    maskValue,
} from '@/lib/community-env-definitions'
import { COMMERCIAL_ENV_DEFINITIONS } from '@/lib/commercial-env-definitions'

export function performEnvAudit(scope: string = 'community', allowCommercial: boolean = false) {
    const env = process.env
    const commercialDefs = COMMERCIAL_ENV_DEFINITIONS

    let targetDefs: EnvVarDefinition[]
    let currentScope = 'community'

    if (allowCommercial && scope === 'commercial') {
        currentScope = 'commercial'
        targetDefs = commercialDefs.map((c: any) => ({
            name: c.name,
            category: c.category,
            service: c.service,
            requirement: (c.requirement === 'required_commercial' ? 'required' : 'optional') as EnvVarRequirement,
            isSecret: c.isSecret,
            description: c.description,
            whyNeeded: c.whyNeeded,
            signUpUrl: c.signUpUrl,
            signUpLabel: c.signUpLabel,
            howToGet: c.howToGet,
            example: c.example,
        }))
    } else if (allowCommercial && scope === 'all') {
        currentScope = 'all'
        targetDefs = [
            ...COMMUNITY_ENV_DEFINITIONS,
            ...commercialDefs.map((c: any) => ({
                name: c.name,
                category: c.category,
                service: c.service,
                requirement: (c.requirement === 'required_commercial' ? 'required' : 'optional') as EnvVarRequirement,
                isSecret: c.isSecret,
                description: c.description,
                whyNeeded: c.whyNeeded,
                signUpUrl: c.signUpUrl,
                signUpLabel: c.signUpLabel,
                howToGet: c.howToGet,
                example: c.example,
            })),
        ]
    } else {
        // Pure Community Edition check
        currentScope = 'community'
        targetDefs = COMMUNITY_ENV_DEFINITIONS
    }

    // Test storage resolution
    let storageResult: {
        ok: boolean
        provider?: string
        bucket?: string
        usingLegacyEnv?: boolean
        error?: string
    }
    try {
        const resolved = resolveStorageConfig(env)
        storageResult = {
            ok: true,
            provider: resolved.provider,
            bucket: resolved.bucket,
            usingLegacyEnv: resolved.usingLegacyEnv,
        }
    } catch (err: any) {
        storageResult = {
            ok: false,
            error: err.message || 'Storage configuration resolution failed',
        }
    }

    const evaluatedVars = targetDefs.map(def => {
        const rawVal = env[def.name]
        const hasVal = rawVal !== undefined && rawVal.trim().length > 0
        const isPlaceholderVal = hasVal ? isPlaceholder(rawVal!) : false

        let effectiveRequirement: EnvVarRequirement = def.requirement
        let conditionReason: string | undefined = undefined

        if (def.conditionReason) {
            const cond = def.conditionReason(env)
            if (cond.isRequired) {
                effectiveRequirement = 'required'
            } else {
                effectiveRequirement = 'optional'
            }
            conditionReason = cond.reason
        }

        let status: EnvVarStatus
        if (!hasVal) {
            status = effectiveRequirement === 'required' ? 'missing' : 'optional_missing'
        } else if (isPlaceholderVal) {
            status = 'placeholder'
        } else {
            status = 'configured'
        }

        return {
            name: def.name,
            category: def.category,
            service: def.service,
            requirement: effectiveRequirement,
            isSecret: def.isSecret,
            status,
            isSet: hasVal && !isPlaceholderVal,
            maskedValue: maskValue(def.name, rawVal, def.isSecret),
            description: def.description,
            whyNeeded: def.whyNeeded,
            signUpUrl: def.signUpUrl,
            signUpLabel: def.signUpLabel,
            howToGet: def.howToGet,
            example: def.example,
            conditionReason,
        }
    })

    const requiredVars = evaluatedVars.filter(v => v.requirement === 'required')
    const optionalVars = evaluatedVars.filter(v => v.requirement !== 'required')

    const requiredMissing = requiredVars.filter(v => v.status === 'missing' || v.status === 'placeholder')
    const optionalMissing = optionalVars.filter(v => v.status === 'optional_missing')

    let overallStatus: 'healthy' | 'action_required' | 'warning' = 'healthy'
    let statusMessage = 'All required community environment variables are properly configured.'

    if (requiredMissing.length > 0 || (!storageResult.ok && currentScope !== 'commercial')) {
        overallStatus = 'action_required'
        const count = requiredMissing.length
        statusMessage = `${count} required variable${count === 1 ? '' : 's'} missing or placeholder.`
    } else if (evaluatedVars.some(v => v.status === 'placeholder')) {
        overallStatus = 'warning'
        statusMessage = 'Some variables are set to example placeholders.'
    }

    const categories = Array.from(new Set(targetDefs.map(d => d.category)))

    return {
        edition: currentScope,
        summary: {
            edition: currentScope,
            totalChecked: evaluatedVars.length,
            requiredTotal: requiredVars.length,
            requiredConfigured: requiredVars.length - requiredMissing.length,
            requiredMissingCount: requiredMissing.length,
            optionalTotal: optionalVars.length,
            optionalConfigured: optionalVars.length - optionalMissing.length,
            status: overallStatus,
            statusMessage,
            storageResult,
        },
        missingRequiredNames: requiredMissing.map(v => v.name),
        variables: evaluatedVars,
        categories,
        checkedAt: new Date().toISOString(),
    }
}
