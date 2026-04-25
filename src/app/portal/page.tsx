// Editor entry point: server component fetches data, client component handles UI.
import { supabaseServer } from '@/lib/supabase-server';
import { Editor } from './editor';

export const dynamic = 'force-dynamic';

export default async function EditorPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: m } = await sb
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!m) return <div>No site assigned.</div>;

  const [{ data: content }, { data: media }] = await Promise.all([
    sb.from('site_content').select('*').eq('tenant_id', m.tenant_id).maybeSingle(),
    sb.from('media').select('id, public_url, filename').eq('tenant_id', m.tenant_id).order('created_at', { ascending: false }),
  ]);

  return <Editor content={content || {}} media={media || []} />;
}
