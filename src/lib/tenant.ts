// Resolve "which tenant is this request for?" from the incoming hostname,
// or fall back to a slug param when running on a single-host preview (e.g. Railway).
import { supabasePublic } from './supabase-server';

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com';
const PORTAL = process.env.NEXT_PUBLIC_PORTAL_HOST || 'portal';

const LOCAL_TLDS = ['localhost', 'local'];

export type TenantContext =
  | { kind: 'portal' }
  | { kind: 'site'; slug: string }
  | { kind: 'marketing' };

const HOST_RE = /^[a-z0-9.-]+$/;

export function resolveHost(host: string): TenantContext {
  const h = host.split(':')[0].toLowerCase();
  if (!HOST_RE.test(h)) return { kind: 'marketing' };

  if (h === ROOT || h === `www.${ROOT}`) return { kind: 'marketing' };
  if (h === `${PORTAL}.${ROOT}`) return { kind: 'portal' };

  for (const tld of LOCAL_TLDS) {
    if (h === tld || h === `www.${tld}`) return { kind: 'marketing' };
    if (h === `${PORTAL}.${tld}`) return { kind: 'portal' };
    if (h.endsWith(`.${tld}`)) {
      return { kind: 'site', slug: h.slice(0, -1 - tld.length) };
    }
  }

  if (h.endsWith(`.${ROOT}`)) {
    return { kind: 'site', slug: h.slice(0, -1 - ROOT.length) };
  }

  return { kind: 'site', slug: h };
}

export async function loadSiteByHost(host: string) {
  const ctx = resolveHost(host);
  if (ctx.kind !== 'site') return null;
  return loadSiteBySlug(ctx.slug);
}

export async function loadSiteBySlug(slug: string) {
  if (!HOST_RE.test(slug)) return null;

  const sb = supabasePublic();
  const { data: tenant } = await sb
    .from('tenants')
    .select('*')
    .or(`slug.eq.${slug},custom_domain.eq.${slug}`)
    .eq('status', 'active')
    .maybeSingle();

  if (!tenant) return null;

  const { data: content } = await sb
    .from('site_content')
    .select('*')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  return { tenant, content };
}
