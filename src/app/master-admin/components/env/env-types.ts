export type EnvVarRequirement = 'required' | 'conditional' | 'optional'
export type EnvVarStatus = 'configured' | 'missing' | 'placeholder' | 'optional_missing'

export type EnvVarItem = {
    name: string
    category: string
    service: string
    requirement: EnvVarRequirement
    isSecret: boolean
    status: EnvVarStatus
    isSet: boolean
    maskedValue?: string
    description: string
    whyNeeded: string
    signUpUrl: string
    signUpLabel: string
    howToGet: string
    example: string
    conditionReason?: string
}

export type EnvCheckResponse = {
    edition: 'community' | 'commercial' | 'all'
    summary: {
        edition: string
        totalChecked: number
        requiredTotal: number
        requiredConfigured: number
        requiredMissingCount: number
        optionalTotal: number
        optionalConfigured: number
        status: 'healthy' | 'action_required' | 'warning'
        statusMessage: string
        storageResult: {
            ok: boolean
            provider?: string
            bucket?: string
            usingLegacyEnv?: boolean
            error?: string
        }
    }
    missingRequiredNames: string[]
    variables: EnvVarItem[]
    categories: string[]
    checkedAt: string
}

export interface EnvCheckTabProps {
    onSummaryLoaded?: (summary: EnvCheckResponse['summary']) => void
    apiEndpoint?: string
    showCommercialScope?: boolean
}
