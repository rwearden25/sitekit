'use client';
// Image upload + library. Storage RLS ensures customers can only write under their
// own tenant folder. Inserts use the storage_path from the upload, not URL parsing,
// so future Supabase URL changes don't break delete.
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type MediaRow = {
  id: string;
  public_url: string;
  storage_path: string;
  filename: string | null;
  size_bytes: number | null;
  content_type: string | null;
  created_at: string;
};

export default function MediaPage() {
  const sb = supabaseBrowser();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [items, setItems] = useState<MediaRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data: m } = await sb
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (!m) return;
      setTenantId(m.tenant_id);
      const { data: media } = await sb
        .from('media')
        .select('*')
        .eq('tenant_id', m.tenant_id)
        .order('created_at', { ascending: false });
      setItems((media as MediaRow[]) || []);
    })();
  }, []);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (!file.type.startsWith('image/')) {
      setMsg({ ok: false, text: 'Only image files are allowed.' });
      e.target.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      setMsg({ ok: false, text: `File is too large. Max 5 MB.` });
      e.target.value = '';
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
      const path = `${tenantId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await sb.storage
        .from('site-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = sb.storage.from('site-media').getPublicUrl(path);
      const { data: row, error: insErr } = await sb
        .from('media')
        .insert({
          tenant_id: tenantId,
          storage_path: path,
          public_url: publicUrl,
          filename: file.name,
          size_bytes: file.size,
          content_type: file.type,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      setItems([row as MediaRow, ...items]);
      setMsg({ ok: true, text: 'Uploaded.' });
    } catch (err: any) {
      setMsg({ ok: false, text: `Error: ${err.message}` });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function remove(item: MediaRow) {
    if (!confirm(`Delete ${item.filename || 'this image'}?`)) return;
    if (item.storage_path) {
      await sb.storage.from('site-media').remove([item.storage_path]);
    }
    const { error } = await sb.from('media').delete().eq('id', item.id);
    if (error) {
      setMsg({ ok: false, text: `Error: ${error.message}` });
      return;
    }
    setItems(items.filter((x) => x.id !== item.id));
    setMsg({ ok: true, text: 'Deleted.' });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5">
        <h2 className="font-semibold mb-2">Upload image</h2>
        <p className="text-sm text-slate-500 mb-3">JPG, PNG, or WebP. Max 5 MB.</p>
        <input
          type="file"
          accept="image/*"
          onChange={upload}
          disabled={busy}
          className="text-sm"
        />
        {msg && (
          <div
            className={`mt-3 rounded px-3 py-2 text-sm ${
              msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {msg.text}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-5 text-center text-sm text-slate-500">
          No images yet. Upload one above to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border bg-white p-3">
              <img src={it.public_url} alt={it.filename || ''} className="h-40 w-full object-cover rounded" />
              <div className="text-xs mt-2 truncate" title={it.filename || ''}>{it.filename}</div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(it.public_url);
                    setMsg({ ok: true, text: 'URL copied.' });
                  }}
                  className="text-xs px-2 py-1 rounded border hover:bg-slate-50"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => remove(it)}
                  className="text-xs px-2 py-1 rounded border text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
