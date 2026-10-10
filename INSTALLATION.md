# TeamVault Community Edition — Installation Manual

A comprehensive, step-by-step guide to installing, configuring, and deploying TeamVault Community Edition.

- **GitHub Repository**: [https://github.com/witherstaff/teamvault-community](https://github.com/witherstaff/teamvault-community)
- **Clone URL**: `git clone https://github.com/witherstaff/teamvault-community.git`
- **License**: [Business Source License 1.1 (BSL 1.1)](LICENSE) — Free for internal business use & self-hosting

> **License Summary**: TeamVault Community Edition is licensed under the **Business Source License 1.1 (BSL 1.1)**:
> - ✅ **Permitted**: Free for personal use, internal business use, testing, modification, and self-hosting for your organization. Converts to **Apache 2.0** 4 years after release.
> - 🚫 **Restricted**: You may not sell it, offer it as a competing cloud/SaaS hosted service, or bundle it into a commercial product without a commercial license. See [LICENSE](LICENSE) for full legal text.

---

> ### 🚀 Looking for an Effortless Solution Without Backend DevOps?
> **Skip managing 4 separate vendor accounts with [TeamVault Cloud (https://teamvault.cloud)](https://teamvault.cloud).**  
> If you don't want to sign up for Auth0, Supabase, Cloudflare R2, and Resend, run SQL database migrations, generate S3 API credentials, and maintain ongoing server updates, **TeamVault Cloud** is our turnkey, fully managed SaaS.  
> - **Ready in 60 seconds**: No API keys, no database migrations, and no server maintenance.
> - **One flat monthly rate**: Storage-based pricing with **unlimited seats / team members** (no per-user fees).
> - **14-day free trial**: Try the complete platform with zero risk.  
> 👉 **[Start your free trial on TeamVault Cloud →](https://teamvault.cloud)**

---

## Zero-Cost Stack: Generous Free Tiers

If you choose to self-host, you can run a production-ready, fully functional instance of TeamVault Community Edition **100% free** using generous developer tiers:

| Service | Component | Free Tier Inclusions |
| :--- | :--- | :--- |
| **Auth0** | Authentication & OIDC | **25,000 Monthly Active Users (MAUs)** free forever, including social login and MFA. |
| **Supabase** | PostgreSQL Database | **500 MB database**, up to 50,000 monthly active users, unlimited API requests. |
| **Cloudflare R2** | Object Storage | **10 GB/month storage** with **$0 egress fees** (unlike AWS S3, Cloudflare never charges bandwidth egress on downloads). |
| **Resend** | Transactional Email | **3,000 emails/month** (100 emails/day), ideal for member invites and bypass security codes. |
| **Vercel** | Hosting & Edge CDN | **Hobby tier** includes free global hosting, automatic SSL, and continuous deployment from GitHub. |

---

## Self-Hosted vs. TeamVault Cloud: Which is Right for You?

| Feature / Requirement | Community Edition (Self-Hosted) | TeamVault Cloud (Managed SaaS) |
| :--- | :--- | :--- |
| **Backend Services to Manage** | **4 separate vendors** (Auth0, Supabase, R2, Resend) | **Zero** — 100% turnkey and fully managed |
| **Initial Setup Time** | 30–60 minutes (API keys, CORS, SQL schemas) | **Under 60 seconds** |
| **Maintenance & Upgrades** | Manual Git pulls, database migrations & monitoring | **Automatic & zero-downtime** continuous updates |
| **Object Storage** | Bring your own S3 / Cloudflare R2 bucket | **Included** high-speed enterprise storage |
| **Database & Backups** | Self-managed Supabase PostgreSQL | **Automated daily backups** with disaster recovery |
| **Team Member Pricing** | **Unlimited** (pay your own infrastructure costs) | **Unlimited** (one flat rate per storage tier, no per-seat fees) |
| **Desktop Sync Client** | Included (`TeamVault Drive` for Mac, Windows, Linux) | Included (`TeamVault Drive` for Mac, Windows, Linux) |
| **Verified Downloads & Geofencing** | Included | Included |
| **Support** | Community GitHub Issues | **Priority email & live support** |
| **License / Cost** | Free for internal business & personal use (BSL 1.1) | **14-day free trial**, then predictable flat monthly plans |

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quickstart (Local Development)](#quickstart-local-development)
3. [Service Setup & API Keys](#service-setup--api-keys)
   - [1. Auth0 (Identity & Login)](#1-auth0-identity--login)
   - [2. Supabase (Database & Schema)](#2-supabase-database--schema)
   - [3. Object Storage (Cloudflare R2 Recommended & Other S3 Providers)](#3-object-storage-cloudflare-r2-recommended--other-s3-providers)
   - [4. Resend (Email Service — Optional)](#4-resend-email-service--optional)
   - [5. Master Admin Configuration](#5-master-admin-configuration)
4. [Configuring Environment Variables](#configuring-environment-variables)
5. [Diagnostics & Preflight with `/install-check`](#diagnostics--preflight-with-install-check)
6. [Securing & Disabling `/install-check`](#securing--disabling-install-check)
7. [Deploying to Production (Vercel)](#deploying-to-production-vercel)
8. [Turnkey Alternative: TeamVault Cloud](#turnkey-alternative-teamvault-cloud)

---

## Prerequisites

Before beginning, ensure you have installed:
- **Node.js**: v18.18.0 or v20+ (Node.js 20 LTS recommended)
- **npm**: v9+ (bundled with Node.js)
- **Git**: Installed and configured

---

## Quickstart (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/witherstaff/teamvault-community.git
cd teamvault-community

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env.local

# 4. Fill in your API keys in .env.local (see Service Setup below)

# 5. Start the local development server
npm run dev
```

The application will start at `http://localhost:3000`.

---

## Service Setup & API Keys

### 1. Auth0 (Identity & Login)
> **Free Tier**: Up to **25,000 monthly active users** at zero cost.

1. Sign up at [https://auth0.com](https://auth0.com) and create a tenant.
2. In the Auth0 Dashboard, navigate to **Applications > Applications > Create Application**.
3. Choose **Regular Web Application** and name it `TeamVault`.
4. Go to the **Settings** tab and configure the URL fields:
   - **Allowed Callback URLs**: `http://localhost:3000/auth/callback` (for local) and `https://your-domain.com/auth/callback` (for production)
   - **Allowed Logout URLs**: `http://localhost:3000` and `https://your-domain.com`
5. Copy the following credentials into your `.env.local`:
   - `AUTH0_DOMAIN`: e.g. `your-tenant.us.auth0.com`
   - `AUTH0_CLIENT_ID`: Your client ID string
   - `AUTH0_CLIENT_SECRET`: Your client secret string
6. Generate a random 32-character encryption secret for `AUTH0_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
7. Set `APP_BASE_URL=http://localhost:3000` (or your production domain).

---

### 2. Supabase (Database & Schema)
> **Free Tier**: **500 MB PostgreSQL**, unlimited API requests, up to 50,000 users.

1. Sign up at [https://supabase.com](https://supabase.com) and click **New Project**.
2. Select your preferred database region and set a strong database password.
3. Once provisioned, execute the database migrations:
   - Navigate to **SQL Editor > New query**.
   - Copy the schema from `supabase/migrations/` in this repository and click **Run**.
4. Retrieve your API Keys under **Project Settings > API Keys**:
   > [!IMPORTANT]
   > Supabase is deprecating legacy JWT `service_role` and `anon` keys by late 2026. Use the new Secret Key (`sb_secret_...`) and Publishable Key (`sb_publishable_...`).
   - `NEXT_PUBLIC_SUPABASE_URL`: e.g. `https://xyzprojectref.supabase.co`
   - `SUPABASE_SECRET_KEY`: Copy the **Secret Key** (starts with `sb_secret_...`)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Copy the **Publishable Key** (starts with `sb_publishable_...`)
5. *(Legacy compatibility)*: If you already have existing legacy keys, `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are also fully supported.

---

### 3. Object Storage (Cloudflare R2 Recommended & Other S3 Providers)

TeamVault is storage-agnostic and connects to any S3-compatible object storage provider. Files upload and download directly between client browsers and your storage bucket via temporary presigned URLs, eliminating server bandwidth bottlenecks.

#### Recommended: Cloudflare R2
> **Free Tier**: **10 GB/month storage** with **$0 egress fees**!  
> While traditional cloud providers (like AWS S3) charge per-gigabyte bandwidth fees every time users download files, Cloudflare R2 charges **$0 for egress**. This prevents unexpected bandwidth bills and makes R2 the strongly recommended option for self-hosting.

1. Sign up at [https://dash.cloudflare.com](https://dash.cloudflare.com) and navigate to **R2**.
2. Click **Create bucket** and choose a name (e.g. `teamvault-files`).
3. Click **Manage R2 API Tokens** > **Create API token**:
   - Permissions: **Object Read & Write**
   - TTL: Forever (or your organization's security policy)
4. Add the credentials to your `.env.local`:
   ```ini
   STORAGE_PROVIDER=r2
   STORAGE_BUCKET_NAME=teamvault-files
   STORAGE_ACCOUNT_ID=your-cloudflare-account-id
   STORAGE_ACCESS_KEY_ID=your-r2-access-key-id
   STORAGE_SECRET_ACCESS_KEY=your-r2-secret-access-key
   ```

---

#### Alternative S3-Compatible Storage Providers

If you already use another cloud provider or require on-premise data residency, TeamVault natively supports 10 different S3 drivers out of the box:

| Provider | `STORAGE_PROVIDER` | Additional Variables Needed | Best Use Case |
| :--- | :--- | :--- | :--- |
| **Cloudflare R2** *(Recommended)* | `r2` | `STORAGE_ACCOUNT_ID` | **Zero egress bandwidth fees**, 10 GB free tier, global performance. |
| **Amazon S3** | `s3` | `STORAGE_REGION` (e.g. `us-east-1`) | Standard AWS infrastructure. *(Note: AWS egress bandwidth fees apply).* |
| **Backblaze B2** | `backblaze` | `STORAGE_REGION` (e.g. `us-west-004`) | Ultra low-cost cloud storage (~$0.006/GB). |
| **Wasabi** | `wasabi` | `STORAGE_REGION` (e.g. `us-east-1`) | High-performance hot cloud storage with zero egress fees. |
| **Google Cloud (GCS)** | `gcs` | *(Uses HMAC keys)* | Google Cloud Storage buckets configured with S3 interoperability keys. |
| **DigitalOcean Spaces** | `digitalocean` | `STORAGE_REGION` (e.g. `nyc3`, `ams3`) | Simple managed object storage built into DigitalOcean. |
| **MinIO (Self-Hosted)** | `minio` | `STORAGE_ENDPOINT=http://localhost:9000` | Ideal for on-premises, private cloud, or air-gapped homelab deployments. |
| **Ceph RADOS Gateway** | `ceph` | `STORAGE_ENDPOINT=https://rgw.example.com` | Enterprise distributed open-source object storage. |
| **IBM Cloud (COS)** | `ibm` | `STORAGE_REGION`, `STORAGE_ENDPOINT` | Enterprise IBM Cloud Object Storage. |
| **Custom S3 Endpoint** | `custom` | `STORAGE_ENDPOINT`, `STORAGE_REGION` | Any S3-compliant gateway, appliance, or regional cloud provider. |

##### Example Configurations for Alternative Providers:
```ini
# Amazon AWS S3:
STORAGE_PROVIDER=s3
STORAGE_BUCKET_NAME=my-teamvault-bucket
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=AKIA...
STORAGE_SECRET_ACCESS_KEY=...

# Backblaze B2:
STORAGE_PROVIDER=backblaze
STORAGE_BUCKET_NAME=my-teamvault-b2
STORAGE_REGION=us-west-004
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...

# Self-Hosted MinIO (Local / On-Premise):
STORAGE_PROVIDER=minio
STORAGE_BUCKET_NAME=teamvault
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin
```

---

#### Step 3.1: Configure Storage CORS (Required for All Providers)
Because TeamVault uploads and downloads files directly from the browser to your storage bucket via presigned URLs, you must configure Cross-Origin Resource Sharing (CORS):

Run the automated CORS provisioning script:
```bash
npx -y tsx scripts/set-storage-cors.ts
```

#### Step 3.2: Verify Storage Connectivity
Verify your bucket credentials, endpoints, and read/write access before launching:
```bash
npx -y tsx scripts/check-storage.ts
```

---

### 4. Resend (Email Service — Optional)
> **Free Tier**: **3,000 emails/month** (100 emails/day).

Resend handles workspace invitation emails and security bypass codes.
1. Sign up at [https://resend.com](https://resend.com) and create an API key at **API Keys > Create API Key**.
2. Verify your sending domain under **Domains** (e.g. `yourdomain.com`).
3. Add to `.env.local`:
   - `RESEND_API_KEY=re_your-key`
   - `EMAIL_FROM_INVITES=TeamVault Invites <invites@yourdomain.com>`
   - `EMAIL_FROM_SECURITY=TeamVault Security <security@yourdomain.com>`

---

### 5. Master Admin Configuration

1. In `.env.local`, set your administrator email address:
   ```bash
   MASTER_ADMIN_EMAILS=admin@yourcompany.com
   ```
   *(Multiple emails can be separated by commas, e.g. `admin1@example.com,admin2@example.com`).*
2. This grants authorized users access to `/master-admin` for workspace management, tenant analytics, and system oversight.

---

## Configuring Environment Variables

Copy `.env.example` to `.env.local` and populate your variables:

```ini
# ── Auth0 (v4 SDK) ───────────────────────────────────────────────
AUTH0_SECRET=your-32-char-random-secret-here
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
APP_BASE_URL=http://localhost:3000

# ── Supabase ─────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-publishable-key
SUPABASE_SECRET_KEY=sb_secret_your-supabase-secret-key

# ── Object Storage (Cloudflare R2 Recommended) ───────────────────
STORAGE_PROVIDER=r2
STORAGE_BUCKET_NAME=teamvault-files
STORAGE_ACCESS_KEY_ID=your-r2-access-key-id
STORAGE_SECRET_ACCESS_KEY=your-r2-secret-access-key
STORAGE_ACCOUNT_ID=your-cloudflare-account-id

# ── App & Navigation ─────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_WORKSPACE_ID=your-first-workspace-uuid
MASTER_ADMIN_EMAILS=admin@yourdomain.com

# ── Email Service (Optional) ─────────────────────────────────────
RESEND_API_KEY=re_your-resend-api-key
EMAIL_FROM_INVITES=TeamVault Invites <invites@yourdomain.com>
EMAIL_FROM_SECURITY=TeamVault Security <security@yourdomain.com>
```

---

## Diagnostics & Preflight with `/install-check`

TeamVault Community Edition includes a built-in preflight diagnostic tool accessible at:

```
http://localhost:3000/install-check
```

### Why Use `/install-check`?
- **No Login Required**: Audits your deployment before you attempt Auth0 login, preventing broken redirects or blank error screens.
- **Deep Storage Connectivity Test**: Tests active resolution of your Cloudflare R2 / S3 bucket, verifying credentials and driver configuration.
- **Placeholder Detection**: Flags variables that still have dummy or placeholder values (e.g. `your-tenant`).
- **Secret Masking**: All secrets, JWTs, and API tokens are masked for secure viewing.
- **1-Click Copy Missing Snippet**: Provides a single button to generate an `.env` snippet of every missing or misconfigured variable.

---

## Securing & Disabling `/install-check`

Because `/install-check` is public to assist during fresh setups, **it should be locked once your instance is running**:

### Method 1: Environment Variable (Recommended — No Code Changes)
Add the following variable in Vercel or your `.env.local`:
```ini
DISABLE_INSTALL_CHECK=true
```
When set, all visits to `/install-check` and requests to `/api/install-check` immediately return `403 Forbidden`.

### Method 2: Permanent Removal
If you prefer to permanently purge the diagnostic page from your code:
```bash
rm -rf src/app/install-check src/app/api/install-check
```

---

## Deploying to Production (Vercel)

1. Push your repository to your private or organization GitHub account.
2. Go to [https://vercel.com/new](https://vercel.com/new) and import `teamvault-community`.
3. Under **Environment Variables**, paste the keys from your `.env.local`.
   - Update `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://vault.yourdomain.com`).
   - Add `DISABLE_INSTALL_CHECK=true` after verifying your setup.
4. Click **Deploy**.
5. Update your Auth0 **Allowed Callback URLs** and **Allowed Logout URLs** to include your Vercel production URL.

---

## Troubleshooting & Verification Scripts

The repository includes dedicated utility scripts for debugging:

```bash
# Verify S3 / Cloudflare R2 bucket connectivity & credentials
npx -y tsx scripts/check-storage.ts

# Apply required CORS headers to your R2 / S3 bucket
npx -y tsx scripts/set-storage-cors.ts

# Test Supabase database querying
npx -y tsx scripts/test-query.ts
```

---

## Turnkey Alternative: TeamVault Cloud

Managing multiple cloud backend vendors isn't for every organization. If your team needs secure file vault capabilities today without spending hours configuring cloud accounts:

### Why Teams Choose TeamVault Cloud (SaaS):
- **Zero Backend Configuration**: No Auth0 tenants to set up, no Supabase databases to migrate, and no S3 IAM policies to write.
- **Instant Workspace Deployment**: Create an account and start uploading files in under 60 seconds.
- **Uncapped Collaboration**: Unlike competitors that charge $15–$25 per seat, TeamVault Cloud charges one flat monthly fee per storage tier with **unlimited users and clients**.
- **Automated Security & Maintenance**: Continuous zero-downtime updates, automated PostgreSQL database backups, and DDoS protection included out of the box.
- **Enterprise-Grade Infrastructure**: Powered by distributed edge infrastructure and high-speed object storage.
- **14-Day Free Trial**: Experience all capabilities with zero upfront commitment.

👉 **[Get Started with TeamVault Cloud at https://teamvault.cloud →](https://teamvault.cloud)**

---

*Need help or want to contribute? Visit the [TeamVault Community Repository](https://github.com/witherstaff/teamvault-community).*
