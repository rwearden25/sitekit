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

export function Editor({ content, media, publicHost }: { content: any; media: MediaItem[]; publicHost: string }) {
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

  const isFirstTime = !content.hero_headline && !content.about_body && (form.services?.length ?? 0) === 0;

  function save() {
    setMsg(null);
    start(async () => {
      const result = await saveSiteContent(form);
      if (result.ok) setMsg({ ok: true, text: 'Saved. Your changes are live.' });
      else setMsg({ ok: false, text: result.error });
    });
  }

  function resetAll() {
    if (!confirm("Reset your site to a blank slate? This deletes every word and image you've added. You can't undo this.")) return;
    setMsg(null);
    start(async () => {
      const result = await resetSiteContent();
      if (result.ok) {
        setMsg({ ok: true, text: 'Site reset. Reloading…' });
        location.reload();
      } else setMsg({ ok: false, text: result.error });
    });
  }

  return (
    <div className="space-y-6">
      {isFirstTime && (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-5">
          <div className="font-semibold text-blue-900">Welcome — let's get your site live.</div>
          <ol className="mt-2 text-sm text-blue-900 list-decimal list-inside space-y-1">
            <li>Fill in a <strong>Headline</strong> below — that's the big text at the top of your site.</li>
            <li>Add at least one <strong>Service</strong> describing what you offer.</li>
            <li>Set your <strong>Phone</strong> so customers can reach you.</li>
            <li>Click <strong>Save changes</strong> at the bottom — that's it.</li>
          </ol>
          <p className="mt-2 text-xs text-blue-800">
            Tip: upload photos in the Media tab first, then come back here and click <strong>Pick</strong> next to any image field.
          </p>
        </div>
      )}

      <Section title="Hero" desc="The top of your site — the first thing visitors see.">
        <Field label="Headline" help="The big bold text. Make a promise or describe what you do." value={form.hero_headline ?? ''} onChange={(v) => set('hero_headline', v)} placeholder="Sparkling clean exteriors, every time" />
        <Field label="Subheadline" help="One supporting sentence below the headline." value={form.hero_subheadline ?? ''} onChange={(v) => set('hero_subheadline', v)} placeholder="Pressure washing for restaurants and retail" />
        <ImageField
          label="Hero background image"
          help="Big photo behind the headline. Landscape (wider than tall) looks best."
          value={form.hero_image_url ?? ''}
          onChange={(v) => set('hero_image_url', v)}
          media={media}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Button label" help="Text shown on the call-to-action button." value={form.hero_cta_label ?? ''} onChange={(v) => set('hero_cta_label', v)} placeholder="Get a Quote" />
          <Field label="Button link" help='Where the button goes. Use "tel:5551234567" to call you, or any web URL.' value={form.hero_cta_link ?? ''} onChange={(v) => set('hero_cta_link', v)} placeholder="tel:5551234567" />
        </div>
      </Section>

      <Section title="About" desc="Tell visitors who you are and why to choose you.">
        <Field label="Section title" value={form.about_title ?? ''} onChange={(v) => set('about_title', v)} placeholder="About Us" />
        <Textarea label="Body text" help="A few sentences. What makes you different? How long have you been around?" value={form.about_body ?? ''} onChange={(v) => set('about_body', v)} rows={5} />
      </Section>

      <Section title="Services" desc="List what you offer. Each becomes a card on your site.">
        <div className="space-y-3">
          {form.services.length === 0 && (
            <div className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-500 text-center">
              No services yet. Click <strong>Add a service</strong> below.
            </div>
          )}
          {form.services.map((s, i) => (
            <div key={i} className="rounded border border-slate-200 p-3 bg-slate-50/40">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-medium text-slate-500">Service #{i + 1}</div>
                <button type="button" onClick={() => removeService(i)} className="text-xs text-red-600 hover:underline">Remove</button>
              </div>
              <div className="space-y-2">
                <Field label="Title" value={s.title} onChange={(v) => setService(i, { title: v })} placeholder="Pressure Washing" />
                <Textarea label="Description" value={s.description ?? ''} onChange={(v) => setService(i, { description: v })} rows={2} placeholder="Two or three sentences" />
                <ImageField
                  label="Image"
                  help="Shows on the service card. Square or landscape both work."
                  value={s.image_url ?? ''}
                  onChange={(v) => setService(i, { image_url: v })}
                  media={media}
                />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addService} className="mt-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 font-medium">
          + Add a service
        </button>
      </Section>

      <Section title="Contact" desc="How customers reach you. Phone and email are tappable on mobile.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phone" value={form.phone ?? ''} onChange={(v) => set('phone', v)} placeholder="555-123-4567" />
          <Field label="Email" value={form.email ?? ''} onChange={(v) => set('email', v)} placeholder="hello@business.com" />
        </div>
        <Textarea label="Address" help="Street, city, state. Shown on the site as plain text." value={form.address ?? ''} onChange={(v) => set('address', v)} rows={2} />
      </Section>

      <Section title="Hours" desc="Leave any day blank to hide it. Type 'Closed' for days you're not open.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DAYS.map((d) => (
            <label key={d.key} className="flex items-center gap-2">
              <span className="w-24 text-sm text-slate-700">{d.label}</span>
              <input
                type="text"
                value={form.hours[d.key] ?? ''}
                onChange={(e) => setHours(d.key, e.target.value)}
                placeholder="8am - 5pm"
                className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Branding" desc="Your colors and logo set the look of the whole site.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorField label="Primary color" help="Main background — used for hero and accents." value={form.brand_primary ?? ''} onChange={(v) => set('brand_primary', v)} />
          <ColorField label="Accent color" help="Used for buttons and links." value={form.brand_accent ?? ''} onChange={(v) => set('brand_accent', v)} />
        </div>
        <ImageField
          label="Logo"
          help="Small image at the very top, above the headline. Transparent PNG works best."
          value={form.logo_url ?? ''}
          onChange={(v) => set('logo_url', v)}
          media={media}
        />
      </Section>

      <Section title="Footer & SEO" desc="Bottom-of-page text and how your site shows in Google.">
        <Field label="Footer text" help="Shows in small text at the very bottom of the page." value={form.footer_text ?? ''} onChange={(v) => set('footer_text', v)} placeholder="© 2026 Your Business. All rights reserved." />
        <Field label="Page title" help="What appears in the browser tab and as the headline of your Google search result." value={form.seo_title ?? ''} onChange={(v) => set('seo_title', v)} placeholder="Acme Cleaning — Pressure Washing in Dallas" />
        <Textarea label="Page description" help="The 1-2 sentence preview Google shows under your link." value={form.seo_description ?? ''} onChange={(v) => set('seo_description', v)} rows={2} placeholder="Family-owned commercial pressure washing serving the Dallas metro since 2018." />
      </Section>

      {msg && (
        <div className={`rounded-md px-4 py-3 text-sm flex flex-wrap items-center gap-3 ${msg.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{msg.text}</span>
          {msg.ok && publicHost && (
            <a
              href={`https://${publicHost}`}
              target="_blank"
              rel="noreferrer"
              className="text-green-900 underline font-medium"
            >
              View live site ↗
            </a>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center sticky bottom-0 bg-slate-50 py-3 border-t border-slate-200">
        <button onClick={save} disabled={pending} className="rounded-md bg-slate-900 px-5 py-2.5 text-white font-semibold disabled:opacity-50">
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <details className="ml-auto">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 px-2 py-1">
            Danger zone
          </summary>
          <div className="mt-2 rounded border border-red-200 bg-red-50 p-3 max-w-xs">
            <div className="text-xs text-red-900 mb-2">
              Wipes all your content back to a blank slate. Cannot be undone.
            </div>
            <button onClick={resetAll} disabled={pending} className="rounded-md border border-red-300 bg-white text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-100 disabled:opacity-50">
              Reset site
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}

// -- field components --

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border bg-white p-5">
      <legend className="px-2 font-semibold">{title}</legend>
      {desc && <p className="text-sm text-slate-500 -mt-1 mb-2">{desc}</p>}
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function Field({ label, help, value, onChange, placeholder }: { label?: string; help?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      {label && <span className="text-sm text-slate-700">{label}</span>}
      {help && <span className="block text-xs text-slate-500 mt-0.5">{help}</span>}
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

function Textarea({ label, help, value, onChange, rows = 3, placeholder }: { label?: string; help?: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <label className="block">
      {label && <span className="text-sm text-slate-700">{label}</span>}
      {help && <span className="block text-xs text-slate-500 mt-0.5">{help}</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

function ColorField({ label, help, value, onChange }: { label: string; help?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-700">{label}</span>
      {help && <span className="block text-xs text-slate-500 mt-0.5">{help}</span>}
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
