# CLAUDE.md — SiteKit project guidance

Multi-tenant one-page site builder + self-serve portal. Sells websites to small businesses (initially SPW commercial accounts) and lets them edit content/images/hours/passwords without admin involvement.

## Stack

- **Next.js 14** App Router, deployed to Railway, single service
- **Supabase** Postgres + Auth + Storage, tenant isolation via RLS
- **Tailwind** for styling, **TypeScript** strict mode
- One repo, one deploy, hostname-based routing

## Architecture cheatsheet

| Hostname | Renders |
|---|---|
| `yourdomain.com` | Marketing root (`src/app/page.tsx`) |
| `portal.yourdomain.com` | Customer editor (`src/app/portal/*`) |
| `<slug>.yourdomain.com` | Public site (`src/app/site/[slug]/*`) — also reachable as `<root>/site/<slug>` for previews without wildcard DNS |

Routing happens in `src/middleware.ts`. Auth on portal routes is enforced in `src/app/portal/layout.tsx` (uses an `x-pathname` header set by middleware to allow `/portal/login` and `/portal/auth/*` to bypass the auth check).

## Three Supabase clients

- `src/lib/supabase.ts` → `supabaseBrowser()` (browser-safe, client components)
- `src/lib/supabase-server.ts` → `supabaseServer()` (cookie-aware RLS) and `supabasePublic()` (service-role; only public-site SSR + admin scripts)

**Never import `supabase-server.ts` from a client component** — it pulls `next/headers` and breaks the build.

## Common tasks

```bash
npm run dev                                              # local dev (works at portal.localhost:3000)
npm run build                                            # production build
npm run provision -- <slug> "<Business>" <owner-email>   # onboard a customer
npm run login-link -- <email>                            # generate a magic link without sending email (bypasses Supabase's 4/hr rate limit)
```

## Deployment

- Push to `main` → Railway auto-deploys
- Env vars set in Railway's Variables tab (mirror `.env.example`)
- After deploy, add the Railway URL to Supabase **Authentication → URL Configuration → Redirect URLs** (with `/**` wildcard)

## Conventions

- All content stored as JSONB in `site_content` so customers can self-serve without schema migrations
- RLS is the security boundary; light client-side validation is for UX clarity, not security
- Server actions revalidate both `/portal` and `/site/<slug>` on save so changes appear immediately
- Image uploads go to `site-media` bucket under `<tenant-id>/<timestamp>-<filename>` paths; storage RLS gates writes by membership in `tenant_members`

## Gotchas

- Supabase free tier: **4 emails/hour**. Use `npm run login-link` instead of relying on the email flow during dev
- Supabase project URL must be the bare host (`https://xxx.supabase.co`), NOT the Data API URL with `/rest/v1/` — the SDK appends that itself
- Service-role key bypasses ALL RLS; never expose it client-side and never commit `.env`
- Magic-link redirect target must be in Supabase's allowlist OR the URL config falls back to Site URL (silent failure mode)

## What's intentionally NOT here

- No Stripe / billing — Ross provisions and bills customers directly
- No public sign-up — only admin-provisioned tenants
- No tenant self-edit of `plan` / `status` / `slug` (RLS deliberately omits an UPDATE policy on `tenants`)
