# SiteKit — Multi-Tenant One-Page Site Builder + Self-Serve Portal

A framework that lets you ship one-page mobile-friendly sites for multiple
customers, then hands them a portal so they update their own content,
images, hours, and passwords without involving you.

## How it works (architecture in 60 seconds)

```
                        Railway (1 service, 1 deploy)
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
 acme.yourdomain.com      portal.yourdomain.com       acmecleaning.com
 (public one-pager)       (customer editor)           (custom domain)
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   ▼
                              Supabase
                       Postgres • Auth • Storage
                       (RLS keeps tenants separate)
```

- **One Next.js app** serves both the public sites AND the editor portal
- **Hostname-based routing** in `middleware.ts` decides which one to render
- **All content in Postgres** as JSONB → customers edit a form, site updates
- **Supabase Auth** handles sign-in, password resets, magic links — zero
  password handling code on your side
- **Supabase Storage** with RLS holds uploaded images, scoped per tenant
- **Row-Level Security** means a customer literally cannot see or edit
  another customer's data, even if they tried

## What customers can self-serve

- ✅ Edit hero headline, subheadline, body copy
- ✅ Upload and swap images (logo, hero, services)
- ✅ Update phone, email, address, business hours
- ✅ Add/edit/remove services
- ✅ Change brand colors
- ✅ Reset their own password (magic link OR password reset email)
- ✅ Update SEO title/description

## What stays with you (admin)

- Provisioning new tenants (one CLI command)
- Custom domain setup (DNS + Railway domain config)
- Plan/billing decisions
- Database backups (Supabase handles this)

## Setup

### 1. Supabase project

1. Create a new project at supabase.com
2. SQL Editor → run `supabase/2026-04-25-schema.sql`
3. Storage → create bucket named `site-media`, set it **public**
4. Storage → Policies on `site-media`:
   - SELECT: `true` (anyone can read images for the public sites)
   - INSERT/UPDATE/DELETE: authenticated, only when path's first folder
     matches a tenant the user is a member of:
     ```sql
     ((storage.foldername(name))[1])::uuid IN (
       SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
     )
     ```
5. Auth → Email Templates → customize the magic link / reset emails with
   your branding
6. Copy the URL, anon key, and service-role key into `.env`

### 2. Local dev

```bash
cp .env.example .env   # fill in Supabase keys
npm install
npm run dev            # http://localhost:3000
```

For local subdomain routing, **no hosts file edits needed** — modern browsers
auto-resolve `*.localhost` to 127.0.0.1 (RFC 6761). Just hit:

- `http://localhost:3000` — marketing root
- `http://portal.localhost:3000` — customer portal
- `http://acme.localhost:3000` — public site for tenant `acme` (provision it first)

If your browser doesn't cooperate, add to `C:\Windows\System32\drivers\etc\hosts`
(needs admin) or `/etc/hosts` on macOS/Linux:
```
127.0.0.1  portal.localhost
127.0.0.1  acme.localhost
```

### 3. Railway deploy

1. Push to GitHub
2. Railway → New Project → Deploy from GitHub
3. Set env vars from `.env`
4. Add custom domain `*.yourdomain.com` (wildcard) in Railway
5. DNS: `CNAME *.yourdomain.com -> <project>.up.railway.app`
6. For customer custom domains: add each as a Railway domain, point their
   DNS at Railway, then set `tenants.custom_domain` for that tenant

## Onboarding a new customer (your workflow)

```bash
npm run provision -- acme "Acme Cleaning" owner@acme.com
```

That single command:
1. Creates the tenant row
2. Seeds an empty `site_content` record
3. Sends a Supabase invite email to the owner
4. Links them as the tenant's owner

Customer clicks the email → lands in the portal → starts editing. You're
out of it from this point forward.

## Project layout

```
src/
  middleware.ts                 hostname → portal vs site routing
  lib/
    supabase.ts                 browser/server/public clients
    tenant.ts                   resolve tenant from hostname
  app/
    layout.tsx                  root shell + global styles
    page.tsx                    marketing root
    globals.css                 tailwind imports
    site/[slug]/page.tsx        the public one-page site (SSR + ISR)
    portal/
      layout.tsx                auth-gated shell
      page.tsx                  editor entry (server)
      editor.tsx                editor UI (client)
      actions.ts                save/reset server actions
      login/page.tsx            magic-link sign in
      media/page.tsx            image upload/manage
      account/page.tsx          password change / reset
    api/auth/signout/route.ts
supabase/
  2026-04-25-schema.sql         tables, RLS, triggers
scripts/
  provision-tenant.ts           CLI to onboard customers
```

## Extending later

- **Visual editor**: replace the form on `/portal` with an inline-edit
  preview using `contenteditable` — content stays in the same JSONB columns
- **Templates**: add a `template` column to `tenants`, render different
  layouts in `app/site/[slug]/page.tsx` based on it
- **Stripe billing**: subscribe `tenants.plan` to Stripe Customer Portal;
  set `status='suspended'` on payment failure → middleware shows a "site
  paused" page
- **Domain self-serve**: let customers add their own custom domain in the
  portal; you only need to add it to Railway once

## Why this design

- One deploy means you patch security bugs once, not 50 times
- Adding a customer is `INSERT INTO tenants` — no infrastructure changes
- Customers' edits are instant (ISR revalidates in seconds)
- RLS is enforced by Postgres, not by your code, so even a bug in the
  portal can't leak data across tenants
- Fits your existing stack: same Supabase pattern as the RockStandard Suite
