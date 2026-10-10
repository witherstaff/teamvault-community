/**
 * TeamVault Commercial Edition — Segregated Environment Variable Definitions
 *
 * These definitions are strictly isolated to the Commercial Edition for:
 *   1. Stripe SaaS Billing & Subscriptions
 *   2. Autonomous Machine Agents (USDC on Base & AUP)
 *
 * Community Edition MUST NOT depend on or require these variables.
 */

export type CommercialEnvDefinition = {
    name: string
    category: 'Commercial Billing (Stripe)' | 'Autonomous Agents & Web3'
    service: string
    requirement: 'required_commercial' | 'optional_commercial'
    isSecret: boolean
    description: string
    whyNeeded: string
    signUpUrl: string
    signUpLabel: string
    howToGet: string
    example: string
}

export const COMMERCIAL_ENV_DEFINITIONS: CommercialEnvDefinition[] = [
    // ── Commercial Mode Switch ──────────────────────────────────────
    {
        name: 'NEXT_PUBLIC_COMMERCIAL_MODE',
        category: 'Commercial Billing (Stripe)',
        service: 'TeamVault Cloud',
        requirement: 'required_commercial',
        isSecret: false,
        description: 'Commercial SaaS switch. Enables Stripe checkout, pricing cards, and hosted service branding.',
        whyNeeded: 'Instructs TeamVault to operate as commercial TeamVault Cloud rather than self-hosted Community Edition.',
        signUpUrl: 'https://www.teamvault.cloud',
        signUpLabel: 'TeamVault Cloud',
        howToGet: 'Set to "true" in your environment variables.',
        example: 'true',
    },

    // ── Commercial Billing (Stripe) ────────────────────────────────
    {
        name: 'STRIPE_SECRET_KEY',
        category: 'Commercial Billing (Stripe)',
        service: 'Stripe',
        requirement: 'required_commercial',
        isSecret: true,
        description: 'Stripe secret API key (sk_test_... or sk_live_...).',
        whyNeeded: 'Required in Commercial Edition to initialize Stripe client, create checkout sessions, and open the customer billing portal.',
        signUpUrl: 'https://dashboard.stripe.com/apikeys',
        signUpLabel: 'Stripe API Keys',
        howToGet: 'In Stripe Dashboard > Developers > API Keys > Secret key.',
        example: 'sk_test_51Abc...',
    },
    {
        name: 'STRIPE_WEBHOOK_SECRET',
        category: 'Commercial Billing (Stripe)',
        service: 'Stripe',
        requirement: 'required_commercial',
        isSecret: true,
        description: 'Stripe webhook endpoint signing secret (whsec_...).',
        whyNeeded: 'Required in Commercial Edition to verify incoming webhook signatures at /api/stripe/webhook.',
        signUpUrl: 'https://dashboard.stripe.com/webhooks',
        signUpLabel: 'Stripe Webhooks',
        howToGet: 'In Stripe Dashboard > Developers > Webhooks > [Your Endpoint] > Signing secret.',
        example: 'whsec_abc123...',
    },
    {
        name: 'STRIPE_PRICE_TEAM',
        category: 'Commercial Billing (Stripe)',
        service: 'Stripe',
        requirement: 'required_commercial',
        isSecret: false,
        description: 'Stripe recurring Price ID for Team plan ($25/mo).',
        whyNeeded: 'Used by Commercial checkout session creation to link the Team plan storage quota to a Stripe price.',
        signUpUrl: 'https://dashboard.stripe.com/products',
        signUpLabel: 'Stripe Products',
        howToGet: 'Run npx tsx scripts/setup-stripe.ts or copy from Stripe Dashboard > Products > Team plan price.',
        example: 'price_1QxyzTeam...',
    },
    {
        name: 'STRIPE_PRICE_PRO',
        category: 'Commercial Billing (Stripe)',
        service: 'Stripe',
        requirement: 'required_commercial',
        isSecret: false,
        description: 'Stripe recurring Price ID for Pro plan ($99/mo).',
        whyNeeded: 'Used by Commercial checkout session creation to link the Pro plan storage quota to a Stripe price.',
        signUpUrl: 'https://dashboard.stripe.com/products',
        signUpLabel: 'Stripe Products',
        howToGet: 'Run npx tsx scripts/setup-stripe.ts or copy from Stripe Dashboard > Products > Pro plan price.',
        example: 'price_1QxyzPro...',
    },
    {
        name: 'STRIPE_PRICE_BUSINESS',
        category: 'Commercial Billing (Stripe)',
        service: 'Stripe',
        requirement: 'required_commercial',
        isSecret: false,
        description: 'Stripe recurring Price ID for Business plan ($199/mo).',
        whyNeeded: 'Used by Commercial checkout session creation to link the Business plan storage quota to a Stripe price.',
        signUpUrl: 'https://dashboard.stripe.com/products',
        signUpLabel: 'Stripe Products',
        howToGet: 'Run npx tsx scripts/setup-stripe.ts or copy from Stripe Dashboard > Products > Business plan price.',
        example: 'price_1QxyzBiz...',
    },

    // ── Autonomous Agents & Web3 ───────────────────────────────────
    {
        name: 'USDC_RECEIVING_ADDRESS',
        category: 'Autonomous Agents & Web3',
        service: 'Base / USDC',
        requirement: 'required_commercial',
        isSecret: false,
        description: 'EVM wallet address to receive machine-agent USDC subscription payments on Base.',
        whyNeeded: 'Used by the Autonomous Agent API to issue payment challenges on Base.',
        signUpUrl: 'https://base.org',
        signUpLabel: 'Base Network',
        howToGet: 'Your organization treasury or cold wallet address on Base.',
        example: '0x1234567890abcdef1234567890abcdef12345678',
    },
    {
        name: 'USDC_NETWORK',
        category: 'Autonomous Agents & Web3',
        service: 'Base / USDC',
        requirement: 'optional_commercial',
        isSecret: false,
        description: 'EVM network name (base or base-sepolia).',
        whyNeeded: 'Designates the active blockchain network for agent settlements (defaults to base).',
        signUpUrl: 'https://base.org',
        signUpLabel: 'Base Docs',
        howToGet: 'Set to "base" for mainnet or "base-sepolia" for testnet.',
        example: 'base',
    },
    {
        name: 'AGENT_BASE_CHAIN_ID',
        category: 'Autonomous Agents & Web3',
        service: 'Base / USDC',
        requirement: 'optional_commercial',
        isSecret: false,
        description: 'EVM chain ID (8453 for Base mainnet, 84532 for Sepolia).',
        whyNeeded: 'Ensures transactions are validated against the expected chain.',
        signUpUrl: 'https://chainlist.org/chain/8453',
        signUpLabel: 'Base Chainlist',
        howToGet: 'Set to 8453 for Base mainnet.',
        example: '8453',
    },
    {
        name: 'AGENT_BASE_USDC_CONTRACT',
        category: 'Autonomous Agents & Web3',
        service: 'Base / USDC',
        requirement: 'optional_commercial',
        isSecret: false,
        description: 'USDC ERC-20 contract address on Base.',
        whyNeeded: 'Used to filter on-chain transfer events during payment confirmation.',
        signUpUrl: 'https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        signUpLabel: 'BaseScan USDC',
        howToGet: 'Official Base USDC contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913.',
        example: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    {
        name: 'BASE_RPC_URL',
        category: 'Autonomous Agents & Web3',
        service: 'Base RPC',
        requirement: 'optional_commercial',
        isSecret: true,
        description: 'JSON-RPC provider endpoint for verifying USDC on-chain transfer receipts.',
        whyNeeded: 'Queried by agent-provisioning to verify payment hashes and confirmations.',
        signUpUrl: 'https://alchemy.com',
        signUpLabel: 'Alchemy / Base RPC',
        howToGet: 'Alchemy, Infura, QuickNode Base endpoint, or public https://mainnet.base.org.',
        example: 'https://mainnet.base.org',
    },
]
