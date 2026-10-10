import type { Metadata } from 'next'
import './tutorial.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.teamvault.cloud'

export const metadata: Metadata = {
  title: 'How to Use TeamVault — User Guide',
  description: 'Step-by-step guide to using TeamVault: signing in, uploading files, managing permissions, verified downloads, PDF watermarking, and the TeamVault Drive desktop app.',
  alternates: { canonical: `${APP_URL}/tutorial` },
  openGraph: {
    title: 'TeamVault User Guide',
    description: 'Complete user guide for TeamVault — from your first login to advanced admin features.',
    url: `${APP_URL}/tutorial`,
  },
}

// ── Reusable layout pieces ────────────────────────────────────────

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
      <div style={{
        minWidth: 28, height: 28, borderRadius: '50%',
        background: 'var(--accent)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '0.8125rem', marginTop: 2, flexShrink: 0,
      }}>{n}</div>
      <div style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
      border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
      borderRadius: 8, padding: '0.75rem 1rem',
      fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem',
    }}>
      <strong style={{ color: 'var(--accent)' }}>Tip: </strong>{children}
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'color-mix(in srgb, var(--warning, #d97706) 8%, transparent)',
      border: '1px solid color-mix(in srgb, var(--warning, #d97706) 25%, transparent)',
      borderRadius: 8, padding: '0.75rem 1rem',
      fontSize: '0.875rem', lineHeight: 1.6, marginTop: '1rem',
    }}>
      <strong style={{ color: 'var(--warning, #d97706)' }}>Note: </strong>{children}
    </div>
  )
}

function UI({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
      border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
      color: 'var(--accent)',
      borderRadius: 4, padding: '0.1rem 0.4rem',
      fontSize: '0.8125rem', fontFamily: 'inherit', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function SectionHeading({ id, icon, title, sub }: { id: string; icon: string; title: string; sub: string }) {
  return (
    <div id={id} style={{ paddingTop: '2rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0, paddingLeft: '2.25rem' }}>{sub}</p>
    </div>
  )
}

// ── Nav items ─────────────────────────────────────────────────────

const NAV = [
  { id: 'signing-in',          icon: '🔐', label: 'Signing In' },
  { id: 'free-trial',          icon: '🚀', label: 'Starting a Free Trial' },
  { id: 'folders',             icon: '📁', label: 'Creating Folders' },
  { id: 'uploading',           icon: '⬆️',  label: 'Uploading Files' },
  { id: 'viewing',             icon: '👁️',  label: 'Viewing Files Inline' },
  { id: 'downloading',         icon: '⬇️',  label: 'Downloading Files' },
  { id: 'sharing',             icon: '🔗', label: 'Sharing File Links' },
  { id: 'drive',               icon: '💻', label: 'TeamVault Drive App' },
  { id: 'inviting',            icon: '✉️',  label: 'Inviting Users' },
  { id: 'managing-users',      icon: '👥', label: 'Managing Users' },
  { id: 'groups',              icon: '🏷️',  label: 'Group Permissions' },
  { id: 'folder-permissions',  icon: '🔒', label: 'Folder Permissions' },
  { id: 'verified-downloads',  icon: '🛡️',  label: 'Verified Downloads' },
  { id: 'watermarks',          icon: '🔍', label: 'Verifying Watermarks' },
  { id: 'recycle-bin',         icon: '🗑️',  label: 'Recycle Bin' },
  { id: 'version-history',     icon: '🕐', label: 'Version History' },
]

// ── Page ──────────────────────────────────────────────────────────

export default function TutorialPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img src="/images/teamvault-shield-name.png" alt="TeamVault" style={{ height: 32, width: 'auto' }} />
        </a>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Home</a>
          <a href="/auth/login?returnTo=/vault" style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign In →</a>
        </div>
      </div>

      <div style={{ display: 'flex', maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0, position: 'sticky', top: '2rem',
          alignSelf: 'flex-start', marginRight: '3rem',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Contents
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {NAV.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="tutorial-nav-link"
              >
                <span style={{ fontSize: '0.875rem' }}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div style={{ marginTop: '2rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>Need help?</div>
            <a href="mailto:support@teamvault.cloud" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>
              support@teamvault.cloud
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Header */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>TeamVault User Guide</h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Everything you need to know — from signing in for the first time to advanced admin controls, verified downloads, and PDF watermarking.
            </p>
          </div>

          {/* ── Signing In ─────────────────────────────────────── */}
          <SectionHeading id="signing-in" icon="🔐" title="Signing In" sub="TeamVault uses Auth0 for secure single sign-on. No separate password required." />

          <Step n={1}>Go to <a href="https://www.teamvault.cloud" style={{ color: 'var(--accent)' }}>teamvault.cloud</a> and click <UI>Log in</UI> in the top navigation, or click <UI>Continue to Login</UI> in the hero panel.</Step>
          <Step n={2}>You will be redirected to the Auth0 login screen. Sign in with your <strong>Google account</strong> or your <strong>email and password</strong>.</Step>
          <Step n={3}>After authenticating, you are automatically redirected back to your vault. If you belong to multiple workspaces, a workspace selection screen appears — click the workspace you want to enter.</Step>

          <Tip>If you were invited by an admin, your account is automatically activated the first time you sign in. You do not need to do anything special.</Tip>
          <Warning>If you see a "No workspaces" screen after signing in, you either haven't started a trial yet or haven't accepted an invitation. Contact your workspace admin to be added.</Warning>

          {/* ── Workspace Setup / Free Trial ─────────────────── */}
          <SectionHeading id="free-trial" icon="🚀" title="Creating a Workspace" sub="Create your team vault with instant provisioning. Self-hosted workspaces are ready immediately; cloud trials include 14 days full access." />

          <Step n={1}>From the homepage or workspaces screen, sign in with Auth0. If you do not have any workspaces yet, you will be prompted to create one.</Step>
          <Step n={2}>In <strong>Community Edition</strong>, click <UI>Create Your First Workspace</UI>, enter your workspace name, and click create. Your workspace and encrypted root vault are provisioned instantly.</Step>
          <Step n={3}>In <strong>Commercial Cloud</strong>, click <UI>Start 14-Day Trial</UI> to begin your trial on the Team plan (1 TB, unlimited users).</Step>
          <Step n={4}>Once setup completes, you are taken directly into your new vault.</Step>

          <Tip>In Commercial Edition, you can manage or upgrade your plan anytime under <UI>Admin → Settings → Manage Subscription</UI>. In Community Edition, your quotas are managed directly by your server administrator.</Tip>

          {/* ── Folders ────────────────────────────────────────── */}
          <SectionHeading id="folders" icon="📁" title="Creating Folders" sub="Organise your vault with nested folders. Permissions can be set independently on each folder." />

          <Step n={1}>Inside your vault, navigate to the location where you want the new folder.</Step>
          <Step n={2}>Click the <UI>+</UI> (New Folder) button in the top-right toolbar.</Step>
          <Step n={3}>Enter a folder name and press <UI>Create</UI>.</Step>
          <Step n={4}>The folder appears immediately in the file list. Click it to navigate inside.</Step>

          <Warning>A folder named <strong>Verified Downloads</strong> is special — only PDF files are allowed inside it, and all downloads from that folder are governed by verified-download rules. See the <a href="#verified-downloads" style={{ color: 'var(--accent)' }}>Verified Downloads</a> section for details.</Warning>

          {/* ── Uploading ──────────────────────────────────────── */}
          <SectionHeading id="uploading" icon="⬆️" title="Uploading Files" sub="Upload individual files or multiple files at once directly from your browser." />

          <Step n={1}>Navigate into the folder you want to upload files into. You cannot upload directly to the vault root — you must be inside a folder.</Step>
          <Step n={2}>Click the <UI>Upload</UI> button in the top-right toolbar.</Step>
          <Step n={3}>In the upload modal, click <UI>Choose Files</UI> or drag and drop files onto the upload area. You can select multiple files at once.</Step>
          <Step n={4}>Each file shows an individual progress bar. Uploads go directly to encrypted cloud storage. When all files show a green checkmark, click <UI>Done</UI>.</Step>

          <Tip>Files up to <strong>5 GB</strong> per file are supported. All file types are accepted unless your admin has restricted uploads to specific formats.</Tip>
          <Warning>You must have <strong>Upload</strong> permission for the workspace to see the Upload button. If you only have view access, contact your admin.</Warning>

          {/* ── Viewing ────────────────────────────────────────── */}
          <SectionHeading id="viewing" icon="👁️" title="Viewing Files Inline" sub="Many file types open directly in your browser without downloading." />

          <Step n={1}>In the file list, click the name of any file.</Step>
          <Step n={2}>TeamVault opens a viewer panel on the right side of the screen. Supported formats include <strong>PDF</strong>, common <strong>image formats</strong> (PNG, JPG, GIF, WebP), and plain <strong>text files</strong>.</Step>
          <Step n={3}>To close the viewer, press <UI>Escape</UI> or click the <UI>✕</UI> button in the viewer panel.</Step>

          <Tip>PDFs open with the browser's native PDF renderer, including zoom and page navigation controls. For large PDFs, the first render may take a few seconds while the secure download link is generated.</Tip>

          {/* ── Downloading ────────────────────────────────────── */}
          <SectionHeading id="downloading" icon="⬇️" title="Downloading Files" sub="Download any file you have access to. Links expire after 120 seconds for security." />

          <Step n={1}>Hover over a file in the list to reveal the action icons on the right side of the row.</Step>
          <Step n={2}>Click the <UI>↓ Download</UI> icon, or click the file to open the inline viewer and then click <UI>Download</UI> in the viewer toolbar.</Step>
          <Step n={3}>TeamVault generates a short-lived secure link and your browser begins the download immediately.</Step>

          <Warning>Download links are valid for <strong>120 seconds</strong> and are personal to your session. Do not share these URLs — they will expire and are not appropriate for sharing with others. Use <a href="#sharing" style={{ color: 'var(--accent)' }}>File Sharing</a> or <a href="#verified-downloads" style={{ color: 'var(--accent)' }}>Verified Downloads</a> instead.</Warning>

          {/* ── Sharing ────────────────────────────────────────── */}
          <SectionHeading id="sharing" icon="🔗" title="Sharing File Links with Team Members" sub="Generate secure, expiring links for files that team members can access without navigating the vault." />

          <Step n={1}>Click the name of a file to open it in the inline viewer panel.</Step>
          <Step n={2}>In the viewer toolbar, click <UI>Copy URL</UI>. The link to this file is copied to your clipboard.</Step>
          <Step n={3}>Send the link to your team member via Slack, email, or any messaging tool. The recipient must be a member of your workspace and signed in to TeamVault to open it.</Step>

          <Tip>Links open the file directly in the inline viewer. The recipient must have at least <strong>view permission</strong> on the folder the file lives in, otherwise they will see an access denied message.</Tip>
          <Warning>These links are <strong>internal vault links</strong> — they require the recipient to be logged into TeamVault. If you need to share a file with someone outside your workspace or with additional controls, use <a href="#verified-downloads" style={{ color: 'var(--accent)' }}>Verified Downloads</a>.</Warning>

          {/* ── Drive ──────────────────────────────────────────── */}
          <SectionHeading id="drive" icon="💻" title="TeamVault Drive Desktop App" sub="Sync your vault to a local folder on Windows, macOS, or Linux for offline access and background sync." />

          <Step n={1}>Download the installer from the TeamVault homepage via the <UI>Downloads</UI> menu in the navigation bar. Choose the version for your operating system.</Step>
          <Step n={2}>Run the installer and follow the setup wizard. TeamVault Drive installs as a background service with a system tray icon.</Step>
          <Step n={3}>On first launch, click <UI>Sign In</UI> in the TeamVault Drive window. Your browser opens an Auth0 login screen — sign in with the same account you use for the web vault.</Step>
          <Step n={4}>TeamVault Drive lists all workspaces you belong to. For each workspace you want to sync, click <UI>Select Folder</UI> and choose a local directory on your machine. <strong>Each workspace must sync to a different local folder.</strong></Step>
          <Step n={5}>Click <UI>Start Sync</UI>. TeamVault Drive downloads your vault contents to the selected folder and begins watching for changes. Any file you add, edit, or delete locally is automatically synced to the vault.</Step>

          <Tip>The tray icon shows sync status — a spinning icon means a sync is in progress, a checkmark means everything is up to date. Right-click the tray icon to pause sync, view recent activity, or sign out.</Tip>
          <Warning>Files synced through TeamVault Drive are still subject to your workspace's permission rules. If your access to a folder is removed in the web vault, those files are removed from your local sync on the next sync cycle.</Warning>

          {/* ── ADMIN SECTION ──────────────────────────────────── */}
          <div style={{ marginTop: '3rem', marginBottom: '1.5rem', padding: '1rem 1.25rem', background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>Admin Features</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>The following sections cover features only available to workspace administrators. Access admin settings via the <UI>Admin</UI> link in the sidebar of your vault.</p>
          </div>

          {/* ── Inviting ───────────────────────────────────────── */}
          <SectionHeading id="inviting" icon="✉️" title="Inviting Users" sub="Add team members, clients, or contractors to your workspace by email." />

          <Step n={1}>In your vault, click <UI>Admin</UI> in the left sidebar.</Step>
          <Step n={2}>Go to the <UI>Users</UI> tab and scroll to the <strong>Invite User</strong> panel at the bottom.</Step>
          <Step n={3}>Enter the person's email address. Choose their <strong>role</strong>:
            <ul style={{ marginTop: '0.5rem', lineHeight: 2 }}>
              <li><strong>Admin</strong> — full control: can invite users, manage permissions, and access all admin settings.</li>
              <li><strong>Member</strong> — standard access: can view and (if enabled) upload files, but cannot manage the workspace.</li>
            </ul>
          </Step>
          <Step n={4}>Optionally enable <UI>Can Upload</UI> to grant the member upload permission without making them an admin.</Step>
          <Step n={5}>Click <UI>Invite</UI>. The person's account is pre-created. The next time they sign in to TeamVault with that email address, they are automatically added to your workspace as an active member.</Step>

          <Tip>You do not need to send a separate invitation email — just tell the person to visit teamvault.cloud and sign in. Their account is waiting for them.</Tip>

          {/* ── Managing Users ─────────────────────────────────── */}
          <SectionHeading id="managing-users" icon="👥" title="Managing Users" sub="Change roles, toggle upload access, and remove or disable users." />

          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Changing a user's role</h3>
            <Step n={1}>In <UI>Admin → Users</UI>, find the user in the list.</Step>
            <Step n={2}>Click the role badge (<UI>Admin</UI> or <UI>Member</UI>) next to their name to toggle it.</Step>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Toggling upload permission</h3>
            <Step n={1}>Find the user in <UI>Admin → Users</UI>.</Step>
            <Step n={2}>Click the <UI>Upload</UI> toggle switch in their row to grant or revoke upload access without changing their role.</Step>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Disabling a user</h3>
            <Step n={1}>Find the user in <UI>Admin → Users</UI>.</Step>
            <Step n={2}>Click the <UI>Disable</UI> button next to their name. This immediately suspends their access while keeping their account record in the workspace.</Step>
            <Step n={3}>To re-enable them later, click <UI>Enable</UI> in the same location.</Step>
          </div>

          <Warning>Disabling a user takes effect immediately — their active sessions are invalidated on the next request. Synced files on their local TeamVault Drive are removed on the next sync cycle.</Warning>

          {/* ── Groups ─────────────────────────────────────────── */}
          <SectionHeading id="groups" icon="🏷️" title="Group Permissions" sub="Organise users into groups to manage folder access at scale." />

          <Step n={1}>In <UI>Admin</UI>, go to the <UI>Groups</UI> tab.</Step>
          <Step n={2}>Click <UI>Create Group</UI>, enter a name (e.g. "Engineering", "Legal", "Contractors"), and confirm.</Step>
          <Step n={3}>Click <UI>Manage Members</UI> on the new group. Search for users by name or email and click <UI>Add</UI> to include them.</Step>
          <Step n={4}>Once your groups are set up, assign them to folders in the <UI>Folder Permissions</UI> tab (see next section). All members of the group inherit those folder permissions automatically.</Step>

          <Tip>Groups are the recommended way to manage access for teams larger than a few people. Instead of adding individual users to each folder, add the group once and manage membership centrally.</Tip>

          {/* ── Folder Permissions ─────────────────────────────── */}
          <SectionHeading id="folder-permissions" icon="🔒" title="Folder Permissions" sub="Control exactly which users and groups can see each folder. Permissions inherit downward through nested folders." />

          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', lineHeight: 1.7 }}>
            <strong>How it works:</strong> By default, if no access rules exist anywhere in the vault, <em>all workspace members can see everything</em>. The moment you add a rule to any folder, TeamVault switches to <strong>explicit-only</strong> mode for that folder and its children — only users or groups you explicitly grant access to can see that content.
          </div>

          <Step n={1}>In <UI>Admin</UI>, go to the <UI>Folder Permissions</UI> tab.</Step>
          <Step n={2}>Select the folder you want to restrict from the folder tree on the left.</Step>
          <Step n={3}>Click <UI>Add Rule</UI>. Choose whether to grant access to an individual <strong>User</strong> or a <strong>Group</strong>.</Step>
          <Step n={4}>Search for the user or group by name and click <UI>Grant Access</UI>.</Step>
          <Step n={5}>The rule is saved immediately. Any user not explicitly listed (or in a listed group) will no longer see this folder or any of its contents.</Step>
          <Step n={6}>To remove a rule, click the <UI>✕</UI> button next to it in the rules list.</Step>

          <Tip>Permissions cascade downward. If you grant a group access to a parent folder, they automatically have access to all sub-folders inside it, unless a sub-folder has its own more restrictive rules.</Tip>
          <Warning>Admins always have access to all folders, regardless of permission rules.</Warning>

          {/* ── Verified Downloads ─────────────────────────────── */}
          <SectionHeading id="verified-downloads" icon="🛡️" title="Verified Downloads" sub="Distribute sensitive files with controlled access, download limits, expiry dates, and optional PDF watermarking." />

          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', lineHeight: 1.7 }}>
            <strong>What is a Verified Download?</strong> A Verified Download is a controlled share link for a PDF file. You define the rules — who can open it, how many times, until when — and TeamVault enforces them. Every download attempt is permanently logged with the recipient's email, IP address, and timestamp. Optionally, a personalised cover page is prepended to the PDF identifying the downloader.
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.25rem 0 0.75rem' }}>Creating a Verified Download link</h3>

          <Step n={1}>Place the PDF file inside a folder named <strong>Verified Downloads</strong> (or any sub-folder inside it). Only PDF files are supported for verified downloads.</Step>
          <Step n={2}>Hover over the file and click the <UI>🛡️ Share</UI> (verified link) icon, or select <UI>Create Verified Link</UI> from the <UI>⋯</UI> menu.</Step>
          <Step n={3}>In the options panel, configure:
            <ul style={{ marginTop: '0.5rem', lineHeight: 2.1 }}>
              <li><strong>Expiry date</strong> — the link stops working after this date.</li>
              <li><strong>Max downloads</strong> — the total number of successful downloads allowed.</li>
              <li><strong>Email allowlist</strong> — only these email addresses can open the link. Leave blank to allow any signed-in user.</li>
              <li><strong>IP allowlist</strong> — restrict access to specific IP addresses or ranges. Leave blank to allow any IP.</li>
              <li><strong>Watermark PDF</strong> — when enabled, a personalised cover page is automatically prepended to the PDF at download time (see below).</li>
            </ul>
          </Step>
          <Step n={4}>Click <UI>Generate Link</UI>. Copy the link and send it to the recipient by email or any other channel. <strong>The recipient does not need a TeamVault account</strong> if they are on the email allowlist — the link itself authenticates them.</Step>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem' }}>PDF Watermarking</h3>

          <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: '1rem' }}>When <UI>Watermark PDF</UI> is enabled, TeamVault prepends a personalised cover page to the PDF at the moment of download. The original file is never altered. The cover page includes:</p>

          <ul style={{ lineHeight: 2.1, fontSize: '0.9375rem', paddingLeft: '1.5rem' }}>
            <li>The <strong>workspace name</strong>, folder path, and file name</li>
            <li>The <strong>downloader's email address</strong></li>
            <li>The <strong>exact timestamp</strong> and <strong>IP address</strong> of the download</li>
            <li>A unique <strong>session ID</strong> for forensic tracking</li>
            <li>A <strong>SHA-256 checksum</strong> of the original file for integrity verification</li>
          </ul>

          <Tip>The watermark cover page cannot be removed by the recipient — it is prepended as a separate page. Even if the cover page is deleted from a printed or exported copy, the session ID recorded in your audit log still ties the download to the recipient.</Tip>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem' }}>Revoking a Verified Download</h3>

          <Step n={1}>In <UI>Admin → Verified Downloads</UI>, find the rule for the file.</Step>
          <Step n={2}>Click <UI>Revoke</UI>. The link is immediately disabled — any future attempt to use it returns an access denied error.</Step>

          {/* ── Verifying Watermarks ───────────────────────────── */}
          <SectionHeading id="watermarks" icon="🔍" title="Verifying Watermarks" sub="Confirm the authenticity of a watermarked PDF and trace it back to the original download event." />

          <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: '1rem' }}>If a watermarked PDF is shared externally or you receive a document and need to verify its origin, use the <strong>Verify Download</strong> tool.</p>

          <Step n={1}>Go to <a href="https://www.teamvault.cloud/verify" style={{ color: 'var(--accent)' }}>teamvault.cloud/verify</a> or click <UI>Verify Download</UI> in the footer of the homepage.</Step>
          <Step n={2}>Click <UI>Choose File</UI> and select the PDF you want to verify. <strong>The file is never uploaded</strong> — your browser computes its SHA-256 checksum locally and only that checksum is sent to TeamVault.</Step>
          <Step n={3}>TeamVault looks up the checksum against all records in the verified download log.</Step>
          <Step n={4}>If a match is found, the verify page confirms that the file is authentic and unchanged — showing the workspace and file name it originated from. This is sufficient to confirm the file is identical to what was originally distributed.</Step>
          <Step n={5}>If no match is found, either the file was not distributed through TeamVault's verified download system, or the file was altered after download (which invalidates the checksum).</Step>

          <Warning>The verify tool compares the <strong>watermarked version's checksum</strong>. If the cover page is removed or the PDF is modified in any way, the checksum will not match. This is by design — any tampering is detectable.</Warning>
          <Tip>The full download record — including the recipient's email, IP address, timestamp, and session ID — is only visible to workspace admins in <UI>Admin → Verified Downloads</UI>. The public verify page only confirms authenticity, not who downloaded the file.</Tip>

          {/* ── Recycle Bin ────────────────────────────────────── */}
          <SectionHeading id="recycle-bin" icon="🗑️" title="Recycle Bin" sub="Recover accidentally deleted files and folders. Items are retained for a period based on your plan before permanent deletion." />

          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', lineHeight: 1.7 }}>
            <strong>How it works:</strong> When you delete a file or folder in TeamVault, it is <em>soft-deleted</em> — moved to the Recycle Bin rather than immediately destroyed. Items remain recoverable until they either expire (based on your plan's retention period) or are permanently purged by an admin.
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.25rem 0 0.75rem' }}>Accessing the Recycle Bin</h3>

          <Step n={1}>In your vault, click <UI>Recycle Bin</UI> in the left sidebar. This is visible to all workspace admins.</Step>
          <Step n={2}>Deleted items are displayed grouped by when they were deleted: <strong>Today</strong>, <strong>Yesterday</strong>, <strong>This Week</strong>, <strong>This Month</strong>, and <strong>Older</strong>.</Step>
          <Step n={3}>Use the <UI>Search</UI> box to filter by file name, or use the type filter to show only files or only folders.</Step>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem' }}>Restoring deleted items</h3>

          <Step n={1}>Find the item you want to restore in the Recycle Bin list. Each row shows the item's original folder path, when it was deleted, and who deleted it.</Step>
          <Step n={2}>Click the <UI>Restore</UI> button on the right side of the row.</Step>
          <Step n={3}>The item is moved back to its original location. If a file with the same name already exists at that location, TeamVault automatically renames the restored file (e.g. <em>report (restored).pdf</em>) to avoid overwriting it.</Step>

          <Tip>When you restore a folder, all the files inside it are restored at the same time. The entire sub-tree is recovered in one operation.</Tip>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem' }}>Permanently deleting (purging) items</h3>

          <Step n={1}>To free up storage space immediately, click the <UI>Delete</UI> (purge) button next to an item in the Recycle Bin. This permanently removes the file from cloud storage and cannot be undone.</Step>
          <Step n={2}>To purge all items at once, click <UI>Empty Recycle Bin</UI> at the top of the page.</Step>

          <Warning>Purged files are <strong>permanently destroyed</strong> from cloud storage — they cannot be recovered after this action. All version history for a purged file is also removed.</Warning>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem' }}>Retention periods by plan</h3>

          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Plan</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Retention Period</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>Team</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>30 days</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>Pro</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>90 days</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>Business</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>365 days</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>Enterprise</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>Indefinite (custom)</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0.75rem' }}>Internal</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>Indefinite</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Tip>Items approaching their expiry date are highlighted with a warning indicator in the Recycle Bin. Restore them before the deadline if you need to keep them.</Tip>

          {/* ── Version History ─────────────────────────────────── */}
          <SectionHeading id="version-history" icon="🕐" title="Version History" sub="View and restore previous versions of any file. Every upload to an existing file automatically creates a new version." />

          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.875rem', lineHeight: 1.7 }}>
            <strong>How versioning works:</strong> When a file is uploaded with the same name as an existing file in the same folder, TeamVault preserves the previous copy as a version rather than overwriting it. You can view the full history of any file, compare versions by size and checksum, and roll back to any previous version at any time.
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.25rem 0 0.75rem' }}>Viewing version history</h3>

          <Step n={1}>There are two ways to open a file's version history:
            <ul style={{ marginTop: '0.5rem', lineHeight: 2 }}>
              <li>In the file list, hover over the file, click the <UI>⋯</UI> (More Options) menu, and select <UI>Version History</UI>.</li>
              <li>In the Recycle Bin, click the <UI>History</UI> button next to a deleted file.</li>
            </ul>
          </Step>
          <Step n={2}>A panel slides in from the right showing all versions of the file. The <strong>current version</strong> is highlighted at the top. Each previous version shows:
            <ul style={{ marginTop: '0.5rem', lineHeight: 2 }}>
              <li>The <strong>version number</strong> (e.g. v3, v2, v1)</li>
              <li>The <strong>file size</strong> at that version</li>
              <li>The <strong>name and email</strong> of the user who uploaded it</li>
              <li>The <strong>upload timestamp</strong></li>
              <li>The first 12 characters of the <strong>SHA-256 checksum</strong> for integrity verification</li>
            </ul>
          </Step>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem' }}>Restoring a previous version</h3>

          <Step n={1}>In the Version History panel, find the version you want to restore.</Step>
          <Step n={2}>Click <UI>Restore this version</UI>. The selected version becomes the new current version of the file. The previous current version is saved as a version entry, so nothing is permanently lost by a restore.</Step>
          <Step n={3}>The file list updates immediately to reflect the restored content. Anyone who downloads the file will now receive the restored version.</Step>

          <Tip>Restoring a version does <strong>not</strong> delete any other versions. The full history is always preserved until you manually delete individual versions or the file is purged from the Recycle Bin.</Tip>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem' }}>Deleting a specific version</h3>

          <Step n={1}>In the Version History panel, click the <UI>Delete</UI> button next to the version you want to remove.</Step>
          <Step n={2}>The version is permanently deleted and its storage is freed. The remaining versions and the current file are unaffected.</Step>

          <Warning>Deleting an individual version is <strong>permanent and irreversible</strong>. Only delete old versions when you are certain you no longer need them, such as when cleaning up large superseded files to reclaim storage.</Warning>
          <Tip>The SHA-256 checksum shown on each version can be used to independently verify that a downloaded copy of the file is byte-for-byte identical to what is stored in TeamVault — useful for audit and compliance purposes.</Tip>

          {/* Footer */}
          <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <span>&copy; {new Date().getFullYear()} TeamVault</span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</a>
              <a href="/#pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Pricing</a>
              <a href="/auth/login?returnTo=/vault" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign In</a>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
