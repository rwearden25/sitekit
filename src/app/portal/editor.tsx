'use client';
// Friendly client-side editor. Manages local state, calls server actions on save.
// No JSON textareas — services are rows, hours are weekday inputs, image fields
// have a built-in picker that pulls from the tenant's media library.
import { useState, useTransition } from 'react';
import { saveSiteContent, resetSiteContent, type SiteContentInput } from './actions';

type MediaItem = { id: string; public_url: string; filename: string | null };
type Service = { title: string; description?: string; image_url?: string };

const DAYS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export function Editor({ content, media }: { content: any; media: MediaItem[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [form, setForm] = useState<SiteContentInput>({
    hero_headline: content.hero_headline ?? '',
    hero_subheadline: content.hero_subheadline ?? '',
    hero_image_url: content.hero_image_url ?? '',
    hero_cta_label: content.hero_cta_label ?? 'Get a Quote',
    hero_cta_link: content.hero_cta_link ?? '',
    about_title: content.about_title ?? '',
    about_body: content.about_body ?? '',
    phone: content.phone ?? '',
    email: content.email ?? '',
    address: content.address ?? '',
    hours: (content.hours_json as Record<string, string>) || {},
    services: (Array.isArray(content.services_json) ? content.services_json : []) as Service[],
    brand_primary: content.brand_primary ?? '#0f172a',
    brand_accent: content.brand_accent ?? '#2563eb',
    logo_url: content.logo_url ?? '',
    footer_text: content.footer_text ?? '',
    seo_title: content.seo_title ?? '',
    seo_description: content.seo_description ?? '',
  });

  function set<K extends keyof SiteContentInput>(k: K, v: SiteContentInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setHours(day: string, val: string) {
    setForm((f) => ({ ...f, hours: { ...f.hours, [day]: val } }));
  }

  function setService(i: number, patch: Partial<Service>) {
    setForm((f) => ({
      ...f,
      services: f.services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  }

  function addService() {
    setForm((f) => ({ ...f, services: [...f.services, { title: '', description: '', image_url: '' }] }));
  }

  function removeService(i: number) {
    setForm((f) => ({ ...f, services: f.services.filter((_, idx) => idx !== i) }));
  }

  function save() {
    setMsg(null);
    start(async () => {
      const result = await saveSiteContent(form);
      if (result.ok) setMsg({ ok: true, text: 'Saved. Your site has been updated.' });
      else setMsg({ ok: false, text: result.error });
    });
  }

  function resetAll() {
    if (!confirm('Reset your site? This clears all content and starts fresh. Cannot be undone.')) return;
    setMsg(null);
    start(async () => {
      const result = await resetSiteContent();
      if (result.ok) {
        setMsg({ ok: true, text: 'Site reset. Refresh to see the empty editor.' });
        location.reload();
      } else setMsg({ ok: false, text: result.error });
    });
  }

  return (
    <div className="space-y-6">
      <Section title="Hero">
        <Field label="Headline" value={form.hero_headline ?? ''} onChange={(v) => set('hero_headline', v)} placeholder="Your big promise" />
        <Field label="Subheadline" value={form.hero_subheadline ?? ''} onChange={(v) => set('hero_subheadline', v)} placeholder="One sentence describing what you do" />
        <ImageField
          label="Hero background image"
          help="Big photo behind the headline at the top of your site. Best at landscape (wider than tall)."
          value={form.hero_image_url ?? ''}
          onChange={(v) => set('hero_image_url', v)}
          media={media}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Button label" value={form.hero_cta_label ?? ''} onChange={(v) => set('hero_cta_label', v)} placeholder="Get a Quote" />
          <Field label="Button link" value={form.hero_cta_link ?? ''} onChange={(v) => set('hero_cta_link', v)} placeholder="tel:5551234567 or https://..." />
        </div>
      </Section>

      <Section title="About">
        <Field label="Section title" value={form.about_title ?? ''} onChange={(v) => set('about_title', v)} placeholder="About Us" />
        <Textarea label="Body text" value={form.about_body ?? ''} onChange={(v) => set('about_body', v)} rows={5} />
      </Section>

      <Section title="Services">
        <p className="text-sm text-slate-500">List what you offer. Each card shows on the public site.</p>
        <div className="space-y-3">
          {form.services.map((s, i) => (
            <div key={i} className="rounded border border-slate-200 p-3 bg-slate-50/40">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-medium text-slate-500">Service #{i + 1}</div>
                <button type="button" onClick={() => removeService(i)} className="text-xs text-red-600 hover:underline">Remove</button>
              </div>
              <div className="space-y-2">
                <Field label="Title" value={s.title} onChange={(v) => setService(i, { title: v })} placeholder="Pressure Washing" />
                <Textarea label="Description" value={s.description ?? ''} onChange={(v) => setService(i, { description: v })} rows={2} />
                <ImageField
                  label="Image"
                  help="Shows on the service card on your site. Square or landscape works best."
                  value={s.image_url ?? ''}
                  onChange={(v) => setService(i, { image_url: v })}
                  media={media}
                />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addService} className="mt-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
          + Add a service
        </button>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phone" value={form.phone ?? ''} onChange={(v) => set('phone', v)} placeholder="555-123-4567" />
          <Field label="Email" value={form.email ?? ''} onChange={(v) => set('email', v)} placeholder="hello@business.com" />
        </div>
        <Textarea label="Address" value={form.address ?? ''} onChange={(v) => set('address', v)} rows={2} />
      </Section>

      <Section title="Hours">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DAYS.map((d) => (
            <label key={d.key} className="flex items-center gap-2">
              <span className="w-24 text-sm text-slate-700">{d.label}</span>
              <input
                type="text"
                value={form.hours[d.key] ?? ''}
                onChange={(e) => setHours(d.key, e.target.value)}
                placeholder="8am - 5pm  or  Closed"
                className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Branding">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorField label="Primary color" value={form.brand_primary ?? ''} onChange={(v) => set('brand_primary', v)} />
          <ColorField label="Accent color" value={form.brand_accent ?? ''} onChange={(v) => set('brand_accent', v)} />
        </div>
        <ImageField
          label="Logo"
          help="Small image at the top of your site, above the headline. Transparent PNG works best."
          value={form.logo_url ?? ''}
          onChange={(v) => set('logo_url', v)}
          media={media}
        />
      </Section>

      <Section title="Footer & SEO">
        <Field label="Footer text" value={form.footer_text ?? ''} onChange={(v) => set('footer_text', v)} placeholder="© 2026 Your Business. All rights reserved." />
        <Field label="Page title (browser tab + Google)" value={form.seo_title ?? ''} onChange={(v) => set('seo_title', v)} />
        <Textarea label="Page description (Google preview)" value={form.seo_description ?? ''} onChange={(v) => set('seo_description', v)} rows={2} />
      </Section>

      {msg && (
        <div className={`rounded-md px-4 py-3 text-sm ${msg.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center sticky bottom-0 bg-slate-50 py-3">
        <button onClick={save} disabled={pending} className="rounded-md bg-slate-900 px-5 py-2.5 text-white font-medium disabled:opacity-50">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={resetAll} disabled={pending} className="rounded-md border border-red-300 text-red-700 px-4 py-2.5 text-sm hover:bg-red-50 disabled:opacity-50">
          Reset site
        </button>
      </div>
    </div>
  );
}

// -- field components --

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border bg-white p-5">
      <legend className="px-2 font-semibold">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function Field({ label, value, onChange, placeholder }: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      {label && <span className="text-sm text-slate-700">{label}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 3 }: { label?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      {label && <span className="text-sm text-slate-700">{label}</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="mt-1 flex gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded border border-slate-300"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0f172a"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm font-mono"
        />
      </div>
    </label>
  );
}

function ImageField({ label, help, value, onChange, media }: { label: string; help?: string; value: string; onChange: (v: string) => void; media: MediaItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className="block">
        <span className="text-sm text-slate-700">{label}</span>
        {help && <span className="block text-xs text-slate-500 mt-0.5">{help}</span>}
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste a URL, or pick from your media"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            {open ? 'Close' : 'Pick'}
          </button>
        </div>
      </label>
      {value && (
        <img src={value} alt="" className="mt-2 h-20 rounded border border-slate-200 object-cover" />
      )}
      {open && (
        <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-3">
          {media.length === 0 ? (
            <div className="text-sm text-slate-500">No images yet. Upload one in the Media tab.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {media.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(m.public_url); setOpen(false); }}
                  className="block rounded overflow-hidden border border-slate-200 hover:border-slate-900"
                  title={m.filename || ''}
                >
                  <img src={m.public_url} alt="" className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
