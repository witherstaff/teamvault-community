# TeamVault Community Edition

> **Self-Hosted, Source-Available Team File Vault — Free for Internal Use**  
> Secure file collaboration, folder-level access control, geofencing, verified distribution, and desktop synchronization — with zero per-seat licensing fees.

[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-BSL_1.1-blue.svg)](LICENSE)

---

## Overview

**TeamVault Community Edition** is a standalone, self-hostable secure file management and distribution platform. It gives organizations total sovereignty over their data by connecting directly to any S3-compatible object storage provider.

- **No Per-Seat Pricing:** Pay only for your underlying cloud storage infrastructure. Add unlimited team members, clients, and contractors.
- **Direct-to-Storage Transfers:** Files upload and download directly between client browsers and your storage bucket via temporary presigned URLs (no server memory bottlenecks).
- **Zero Proprietary Monetization:** No Stripe SDK, no credit card checkout requirements, and no Web3/blockchain dependencies.

---

## Core Capabilities

- **Folder Hierarchy & Inheritance:** Deeply nested directory structures with recursive permission inheritance and granular overrides.
- **Role-Based Access Control (RBAC):** Admin and User roles with upload permissions and workspace-level boundaries.
- **User Groups:** Group-based folder access lists (ACLs) for scalable team administration.
- **Geofencing & Security:** Restrict workspace access by country, with admin bypass immunity and time-limited, cryptographically hashed email bypass codes.
- **Verified Downloads:** Secure file distribution with download caps, expiration timers, recipient identity logging, and dynamic PDF cover-page watermarking.
- **File Versioning:** Automatic version tracking on file overwrite with point-in-time restore capabilities.
- **Recycle Bin:** Soft-deletion recovery with configurable automatic retention pruning.
- **Desktop Synchronization:** Native bidirectional background desktop client integration (`TeamVault Drive` for Windows, macOS, and Linux).
- **Forensic Audit Logging:** Immutable audit ledger recording logins, uploads, downloads, deletions, and administrative actions.
- **Master Admin Dashboard:** Service-wide operator analytics (`/master-admin`) for managing workspaces, tracking storage quotas, and inspecting system health.
- **Preflight Environment Checker:** Built-in `/install-check` diagnostic tool to verify all database, storage, and Auth0 variables prior to first login.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router with Turbopack) |
| **Language** | TypeScript 5 (Strict Mode) |
| **Authentication** | Auth0 (Google OAuth, OpenID Connect) |
| **Database** | PostgreSQL / Supabase (13 core normalized tables) |
| **Object Storage** | Agnostic S3 (Cloudflare R2, AWS S3, Wasabi, MinIO, Backblaze B2, Google Cloud, Ceph, IBM COS) |
| **PDF Processing** | `pdf-lib` (Dynamic forensic watermarking) |

---

## Quickstart

### Prerequisites

- **Node.js:** 18.18+ or 20+
- **Database:** PostgreSQL or a [Supabase](https://supabase.com) project
- **Authentication:** [Auth0](https://auth0.com) Application (Regular Web Application)
- **Object Storage:** Any S3-compatible bucket (e.g. Cloudflare R2, AWS S3, Wasabi, or MinIO)

> 📖 **Looking for a detailed setup guide?** See the full [Installation Manual](INSTALLATION.md) for step-by-step walkthroughs of Auth0, Supabase, Cloudflare R2, and the `/install-check` diagnostic console.

### 1. Clone the Repository

```bash
git clone https://github.com/witherstaff/teamvault-community.git
cd teamvault-community
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```ini
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000

# Database (Supabase / PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# Modern secret key (sb_secret_...) or legacy SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY=sb_secret_your-supabase-secret-key
# Modern publishable key (sb_publishable_...) or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-publishable-key

# Authentication (Auth0)
AUTH0_SECRET=use-a-32-byte-hex-random-string
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret

# Object Storage (Example: Cloudflare R2)
STORAGE_PROVIDER=r2
STORAGE_BUCKET_NAME=teamvault-files
STORAGE_ACCESS_KEY_ID=your-key-id
STORAGE_SECRET_ACCESS_KEY=your-secret-key
STORAGE_ACCOUNT_ID=your-cloudflare-account-id

# Optional: Master Admin Operator Emails
MASTER_ADMIN_EMAILS=admin@yourcompany.com
```

### 3. Initialize the Database

Execute the canonical Community schema in your PostgreSQL database (or Supabase SQL Editor):

```sql
-- Run the contents of:
src/db/schema.community.sql
```

This provisions the 13 core tables, recursive folder traversal functions (`get_all_descendants`), atomic storage increment procedures (`increment_workspace_storage`), and triggers.

### 4. Verify & Configure Bucket CORS

Run the built-in storage verification and CORS scripts:

```bash
# Test connectivity to your storage provider
npx tsx scripts/check-storage.ts

# Automatically apply required browser PUT/GET CORS rules to the bucket
npx tsx scripts/set-storage-cors.ts
```

### 5. Verify Setup with `/install-check`

Start the Next.js development server:

```bash
npm run dev
```

Before attempting login, open your browser and navigate to:
👉 **[http://localhost:3000/install-check](http://localhost:3000/install-check)**

The **Installation & Environment Checker** performs an unauthenticated diagnostic audit:
- ✅ Confirms all required Auth0, Supabase, and S3 variables are configured.
- 🔍 Detects remaining placeholder values (e.g. `your-tenant`, `your-bucket`).
- ⚡ Live-tests storage configuration resolution against your bucket.
- 📋 Provides a 1-click **Copy Missing .env Snippet** to quickly complete any missing fields.

> 🔒 **Security Notice**: Once your deployment is verified and running, add `DISABLE_INSTALL_CHECK=true` to `.env.local` (or your hosting provider) to lock the diagnostic page.

### 6. Log In & Create Workspace

Visit **[http://localhost:3000](http://localhost:3000)** and sign in via Auth0 to access your vault workspace!

---

## Directory Structure

```
src/
├── app/
│   ├── page.tsx                    # Public landing page (Community presentation)
│   ├── HomePageClient.tsx          # Local sign-in & workspace entry
│   ├── layout.tsx                  # Root HTML layout and providers
│   ├── globals.css                 # Clean CSS theme & tokens
│   ├── tutorial/                   # Comprehensive user & admin onboarding guide
│   ├── geo-blocked/                # Geofence challenge & bypass code resolution
│   ├── download/                   # Direct vault download handler
│   ├── verify/                     # Public claim portal for verified downloads
│   ├── vault/                      # Workspace portal & multi-vault selector
│   │   └── [workspaceId]/          # Main vault UI (file browser, ACLs, recycle bin, settings)
│   ├── master-admin/               # Global operator metrics & health dashboard
│   └── api/
│       ├── auth/                   # Auth0 callback & session handlers
│       ├── admin/                  # Workspace administration (users, groups, folders, audit)
│       ├── vault/                  # S3 presigning, file operations, folder trees
│       ├── desktop/                # Desktop client sync endpoints
│       ├── geo/                    # Geofence evaluation & bypass flow
│       ├── internal/               # Background recycle bin purge worker
│       ├── master-admin/           # Multi-tenant stats & environment health checks
│       └── user/workspaces/create/ # Direct self-hosted workspace provisioning
├── components/                     # Vault modals, file list, uploaders, and landing sections
├── lib/
│   ├── access.ts                   # Recursive folder authorization checks
│   ├── audit.ts                    # Immutable security audit logging
│   ├── auth.ts                     # Auth0 session resolution
│   ├── config.ts                   # Universal quotas & constants (zero billing logic)
│   ├── storage.ts                  # Agnostic S3 presigning & lifecycle driver
│   ├── storage-config.ts           # S3 multi-provider configuration resolver
│   └── workspace-provisioning.ts   # Core workspace initialization helper
└── db/
    ├── index.ts                    # Supabase / PostgreSQL client factory
    ├── schema.community.sql        # Standalone Community database schema (13 core tables)
    ├── schema.sql                  # Canonical base schema
    └── types.ts                    # Pure TypeScript database definitions
```

---

## Deploying to Production

Community Edition can be deployed to any Node.js hosting platform or container environment:

- **Vercel:** Import your repository, set the environment variables from `.env.example`, and deploy.
- **Docker / Self-Hosted Server:** Build and run using the standard Next.js production build:
  ```bash
  npm run build
  npm run start
  ```

---

---

## License

TeamVault Community Edition is licensed under the **Business Source License 1.1 (BSL 1.1)** with an Additional Use Grant. See the complete legal text in the [LICENSE](./LICENSE) file.

### TeamVault Community License Summary

**Permitted:**
- Personal use
- Internal business use
- Evaluation and testing
- Modification and self-hosting
- Contributions back to the project (subject to the CLA)
- Noncommercial redistribution

**Not permitted without a commercial license:**
- Selling TeamVault or derivative works
- Offering TeamVault as SaaS or cloud-hosted service
- Managed hosting of TeamVault for third parties
- Reselling or sublicensing
- Incorporating TeamVault into a commercial competing product
- Offering paid services where TeamVault itself is the core product

> *You may use TeamVault Community internally, including in a business, but you may not sell it, offer it as a hosted service, bundle it into a commercial product, or compete with TeamVault’s commercial offering without a commercial license.*
> 
> **Commercial rights reserved to TeamVault, Inc.**  
> For enterprise licensing, inquiries, or custom terms, contact [licensing@teamvault.cloud](mailto:licensing@teamvault.cloud).

---

## Contributing & Contributor License Agreement (CLA)

We welcome community contributions! All contributions to this repository are subject to the **[TeamVault Contributor License Agreement (CLA)](./CLA.md)**. By submitting a pull request, you grant TeamVault, Inc. the right to include, license, and distribute your contributions in both TeamVault Community Edition and proprietary commercial offerings.
