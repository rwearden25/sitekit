// Editor entry point: server component fetches data, client component handles UI.
import { supabaseServer } from '@/lib/supabase-server';
import { Editor } from './editor';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';

export const dynamic = 'force-dynamic';

export default async function EditorPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: m } = await sb
    .from('tenant_members')
    .select('tenant_id, tenants(slug, custom_domain)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!m) return <div>No site assigned.</div>;

  const tenantId = m.tenant_id as string;
  const t = (m.tenants as any) || {};
  const publicHost: string = t.custom_domain || (t.slug && ROOT_DOMAIN ? `${t.slug}.${ROOT_DOMAIN}` : '');

  const [{ data: content }, { data: media }] = await Promise.all([
    sb.from('site_content').select('*').eq('tenant_id', tenantId).maybeSingle(),
    sb.from('media').select('id, public_url, filename').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
  ]);

  return <Editor content={content || {}} media={media || []} publicHost={publicHost} />;
}
