# TeamVault Production Deployment Guide

This guide details how to deploy **TeamVault Community Edition** in production across various hosting environments, including Docker containers, cloud platforms (Vercel, Railway, Render), and traditional Linux servers (Ubuntu/Debian with Nginx).

---

## 1. Prerequisites & System Requirements

Before deploying, ensure you have provisioned:

| Component | Minimum Requirement | Recommended |
|---|---|---|
| **Runtime** | Node.js 20.9+ | **Node.js 22 LTS** |
| **Package Manager** | npm 9+ | npm 10+ |
| **Memory / CPU** | 1 vCPU, 1 GB RAM | 2 vCPU, 2-4 GB RAM |
| **Database** | PostgreSQL 15+ or Supabase | Supabase (Managed Postgres) |
| **Object Storage** | S3-compatible API | **Cloudflare R2** (Zero egress fees) |
| **Identity Provider** | Auth0 Universal Login | Auth0 (Regular Web App) |
| **Domain & SSL** | Custom domain with TLS/HTTPS | Automated Let's Encrypt / Cloudflare SSL |

---

## 2. Environment Variables Reference

Configure these environment variables in your production environment:

### Core Application & Auth0
```ini
# Canonical public URL (must NOT have a trailing slash)
APP_BASE_URL=https://vault.yourdomain.com
NEXT_PUBLIC_APP_URL=https://vault.yourdomain.com

# 32+ character high-entropy secret for cookie encryption
# Generate via: openssl rand -hex 32
AUTH0_SECRET=your-32-byte-hex-secret
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
```

### Database (Supabase / PostgreSQL)
```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Modern publishable key (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key-here

# Modern secret key (or legacy SUPABASE_SERVICE_ROLE_KEY)
SUPABASE_SECRET_KEY=sb_secret_your-secret-key-here

# Default workspace UUID provisioned upon first setup
NEXT_PUBLIC_DEFAULT_WORKSPACE_ID=your-workspace-uuid
```

### Agnostic S3 Storage
```ini
# Storage provider preset: r2 | s3 | gcs | wasabi | backblaze | digitalocean | minio | ceph | ibm | custom
STORAGE_PROVIDER=r2
STORAGE_BUCKET_NAME=teamvault-production
STORAGE_ACCESS_KEY_ID=your-access-key-id
STORAGE_SECRET_ACCESS_KEY=your-secret-access-key

# Provider specific parameters (e.g. Cloudflare Account ID for R2, or Region for AWS S3)
STORAGE_ACCOUNT_ID=your-cloudflare-account-id
# STORAGE_REGION=us-east-1
# STORAGE_ENDPOINT=https://custom-s3-endpoint.example.com
```

### Administration & Operational Hardening
```ini
# Comma-separated list of emails granted access to /master-admin
MASTER_ADMIN_EMAILS=admin@yourdomain.com,devops@yourdomain.com

# Disable public installation diagnostic check once validated
DISABLE_INSTALL_CHECK=true

# Optional: Transactional emails via Resend
RESEND_API_KEY=re_your-key-here
EMAIL_FROM_INVITES=TeamVault Invites <invites@yourdomain.com>
EMAIL_FROM_SECURITY=TeamVault Security <security@yourdomain.com>
```

---

## 3. Database Initialization & Storage CORS

### 3.1 Execute Database Schema
Run the canonical schema in your database SQL console (Supabase SQL Editor or `psql`):
- Source file: [src/db/schema.community.sql](file:///c:/Users/kpitc/OneDrive/Documents/teamvault-community/source/src/db/schema.community.sql)
- This creates the 13 core relational tables (`users`, `workspaces`, `memberships`, `groups`, `folders`, `files`, `file_versions`, `audit_logs`, etc.).

### 3.2 Configure S3 Bucket CORS
Because browsers upload directly to S3 via presigned URLs, your bucket must allow CORS requests from your application domain:

```bash
# Run the automated CORS helper
npx -y tsx scripts/set-storage-cors.ts
```

Or configure manually in your S3/R2 dashboard:
```json
[
  {
    "AllowedOrigins": ["https://vault.yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 4. Auth0 Production Configuration

In the [Auth0 Dashboard](https://manage.auth0.com):
1. Navigate to **Applications → Applications → Your App**.
2. Update **Application URIs**:
   - **Allowed Callback URLs**: `https://vault.yourdomain.com/auth/callback`
   - **Allowed Logout URLs**: `https://vault.yourdomain.com`
   - **Allowed Web Origins**: `https://vault.yourdomain.com`
3. Click **Save Changes**.

---

## 5. Deployment Options

### Option A: Docker Deployment (Recommended for Self-Hosting)

#### 1. Multi-Stage Dockerfile
Create a `Dockerfile` in the root of the project:

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

> **Note**: To enable `standalone` output for Docker, ensure `next.config.ts` has `output: 'standalone'`.

#### 2. Docker Compose with Caddy (Automatic HTTPS)
Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    restart: unless-stopped
    env_file: .env.production
    expose:
      - "3000"

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  caddy_data:
  caddy_config:
```

#### 3. Caddyfile
```caddy
vault.yourdomain.com {
    reverse_proxy app:3000
}
```

Start the containers:
```bash
docker compose up -d --build
```

---

### Option B: Cloud Platform Deployments (Vercel, Railway, Render)

#### Deploying on Vercel
1. Push `teamvault-community` to your GitHub / GitLab repository.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New → Project** and import the repository.
3. Configure settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Node.js Version**: Select `20.x` or `22.x`
4. Add all environment variables listed in [Section 2](#2-environment-variables-reference).
5. Click **Deploy**.
6. Set your custom domain in **Project Settings → Domains**.

#### Deploying on Railway / Render
1. Connect your repository.
2. Build Command: `npm install && npm run build`
3. Start Command: `npm run start`
4. Populate the environment variables.

---

### Option C: Linux Virtual Server (Ubuntu / Debian + Nginx + PM2)

#### 1. Install Node.js 22 LTS
```bash
# Add NodeSource Node 22 repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential nginx
sudo npm install -g pm2
```

#### 2. Clone and Build Application
```bash
sudo mkdir -p /var/www/teamvault
sudo chown $USER:$USER /var/www/teamvault
git clone https://github.com/witherstaff/teamvault-community.git /var/www/teamvault
cd /var/www/teamvault

# Copy and populate production environment variables
cp .env.example .env.local
nano .env.local

# Install and build
npm ci
npm run build
```

#### 3. Start with PM2 Process Manager
```bash
pm2 start npm --name "teamvault" -- start
pm2 save
pm2 startup
```

#### 4. Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/teamvault`:

```nginx
server {
    server_name vault.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 100M;
    }
}
```

Enable the site and obtain a free Let's Encrypt certificate:
```bash
sudo ln -s /etc/nginx/sites-available/teamvault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install certbot and acquire TLS certificate
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vault.yourdomain.com
```

---

## 6. Post-Deployment Verification

1. **Run Diagnostics Console**:
   - Navigate to `https://vault.yourdomain.com/install-check`.
   - Verify that all checks pass:
     - Auth0 Session & Secret configuration
     - Supabase connection & schema verification
     - Object storage bucket read/write test
2. **Perform First Login**:
   - Sign in via Auth0 to initialize your administrator account.
3. **Hardening**:
   - Once all checks are green, set `DISABLE_INSTALL_CHECK=true` in your environment variables and redeploy/restart.

---

## 7. Backups & Disaster Recovery

### Database Backups (PostgreSQL)
Run automated backups via `pg_dump`:
```bash
# Automated daily backup cron
pg_dump "$DATABASE_URL" -Fc > /backups/teamvault-$(date +\%F).dump
```

### Storage Backups
- **Cloudflare R2 / AWS S3**: Enable bucket versioning and configure cross-region bucket replication (CRR) or lifecycle policies to retain deleted objects in a backup bucket.

### Maintenance Cron
To trigger scheduled cleanup of expired recycle bin items:
```bash
curl -X POST https://vault.yourdomain.com/api/cron/cleanup \
  -H "Authorization: Bearer $INTERNAL_CRON_SECRET"
```
