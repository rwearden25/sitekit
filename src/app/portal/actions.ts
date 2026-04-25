'use server';
// Server actions invoked by the editor client component.
// All writes go through RLS as the logged-in user.
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase-server';

type SaveResult = { ok: true } | { ok: false; error: string };

type Service = { title: string; description?: string; image_url?: string };
type Hours = Record<string, string>;

export type SiteContentInput = {
  hero_headline?: string;
  hero_subheadline?: string;
  hero_image_url?: string;
  hero_cta_label?: string;
  hero_cta_link?: string;
  about_title?: string;
  about_body?: string;
  phone?: string;
  email?: string;
  address?: string;
  hours: Hours;
  services: Service[];
  brand_primary?: string;
  brand_accent?: string;
  logo_url?: string;
  footer_text?: string;
  seo_title?: string;
  seo_description?: string;
};

async function getActiveTenant() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: m } = await sb
    .from('tenant_members')
    .select('tenant_id, tenants(slug)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!m) return null;
  return {
    tenantId: m.tenant_id as string,
    slug: ((m.tenants as any)?.slug as string) ?? null,
    userId: user.id,
  };
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export async function saveSiteContent(input: SiteContentInput): Promise<SaveResult> {
  const ctx = await getActiveTenant();
  if (!ctx) return { ok: false, error: 'Not signed in.' };

  // Light validation — RLS is the security boundary; this is for UX clarity.
  if (input.brand_primary && !HEX_RE.test(input.brand_primary)) {
    return { ok: false, error: 'Primary color must be a hex value like #1a2b3c.' };
  }
  if (input.brand_accent && !HEX_RE.test(input.brand_accent)) {
    return { ok: false, error: 'Accent color must be a hex value like #1a2b3c.' };
  }

  const services = (Array.isArray(input.services) ? input.services : [])
    .filter((s) => s && typeof s.title === 'string' && s.title.trim().length > 0)
    .slice(0, 24);

  const hours = (input.hours && typeof input.hours === 'object') ? input.hours : {};

  const payload = {
    tenant_id: ctx.tenantId,
    hero_headline: input.hero_headline ?? null,
    hero_subheadline: input.hero_subheadline ?? null,
    hero_image_url: input.hero_image_url ?? null,
    hero_cta_label: input.hero_cta_label ?? null,
    hero_cta_link: input.hero_cta_link ?? null,
    about_title: input.about_title ?? null,
    about_body: input.about_body ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    hours_json: hours,
    services_json: services,
    brand_primary: input.brand_primary || '#0f172a',
    brand_accent: input.brand_accent || '#2563eb',
    logo_url: input.logo_url ?? null,
    footer_text: input.footer_text ?? null,
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
    updated_by: ctx.userId,
  };

  const sb = supabaseServer();
  const { error } = await sb.from('site_content').upsert(payload, { onConflict: 'tenant_id' });
  if (error) return { ok: false, error: error.message };

  await sb.from('audit_log').insert({
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    action: 'content.update',
    details: { services: services.length, hours_keys: Object.keys(hours).length },
  });

  revalidatePath('/portal');
  if (ctx.slug) revalidatePath(`/site/${ctx.slug}`, 'layout');
  return { ok: true };
}

export async function resetSiteContent(): Promise<SaveResult> {
  const ctx = await getActiveTenant();
  if (!ctx) return { ok: false, error: 'Not signed in.' };

  const sb = supabaseServer();
  const { error } = await sb
    .from('site_content')
    .upsert(
      {
        tenant_id: ctx.tenantId,
        hero_headline: null,
        hero_subheadline: null,
        hero_image_url: null,
        hero_cta_label: 'Get a Quote',
        hero_cta_link: null,
        about_title: null,
        about_body: null,
        phone: null,
        email: null,
        address: null,
        hours_json: {},
        services_json: [],
        brand_primary: '#0f172a',
        brand_accent: '#2563eb',
        logo_url: null,
        footer_text: null,
        seo_title: null,
        seo_description: null,
        updated_by: ctx.userId,
      },
      { onConflict: 'tenant_id' }
    );
  if (error) return { ok: false, error: error.message };

  await sb.from('audit_log').insert({
    tenant_id: ctx.tenantId,
    user_id: ctx.userId,
    action: 'content.reset',
    details: {},
  });

  revalidatePath('/portal');
  if (ctx.slug) revalidatePath(`/site/${ctx.slug}`, 'layout');
  return { ok: true };
}
