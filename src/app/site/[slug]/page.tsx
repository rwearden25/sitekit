// Renders the public one-page site for a tenant.
// This is a Server Component -- fetches via service-role and SSRs HTML.
// Mobile-friendly via Tailwind. Customers' edits show up on next request.
//
// Two ways this page gets resolved:
//   1. Hostname rewrite by middleware (acme.yourdomain.com -> /site/acme)
//   2. Direct path access (/site/acme) -- used on previews like Railway
//      where wildcard subdomains aren't available.
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { loadSiteByHost, loadSiteBySlug } from '@/lib/tenant';

export const revalidate = 30; // ISR: re-fetch at most every 30s

export default async function PublicSite({ params }: { params: { slug: string } }) {
  const host = headers().get('host') || '';
  const data = (await loadSiteByHost(host)) || (await loadSiteBySlug(params.slug));
  if (!data) notFound();

  const { tenant, content } = data;
  const c = content || {};
  const services: Array<{ title: string; description?: string; image_url?: string }> =
    Array.isArray(c.services_json) ? c.services_json : [];
  const hours: Record<string, string> = c.hours_json || {};

  const primary = c.brand_primary || '#0f172a';
  const accent = c.brand_accent || '#2563eb';

  return (
    <main
      style={{ ['--brand' as any]: primary, ['--accent' as any]: accent }}
      className="min-h-screen bg-white text-slate-900"
    >
      {/* HERO */}
      <section className="relative">
        {c.hero_image_url && (
          <img
            src={c.hero_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        )}
        <div
          className="relative px-6 py-20 sm:py-28"
          style={{ backgroundColor: primary, color: 'white' }}
        >
          <div className="mx-auto max-w-3xl text-center">
            {c.logo_url && (
              <img src={c.logo_url} alt={tenant.business_name} className="mx-auto h-16 mb-6" />
            )}
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              {c.hero_headline || tenant.business_name}
            </h1>
            {c.hero_subheadline && (
              <p className="mt-4 text-lg sm:text-xl opacity-90">{c.hero_subheadline}</p>
            )}
            {c.hero_cta_label && c.hero_cta_link && (
              <a
                href={c.hero_cta_link}
                className="mt-8 inline-block rounded-md px-6 py-3 font-semibold"
                style={{ backgroundColor: accent, color: 'white' }}
              >
                {c.hero_cta_label}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      {(c.about_title || c.about_body) && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            {c.about_title && <h2 className="text-3xl font-bold mb-4">{c.about_title}</h2>}
            {c.about_body && (
              <p className="text-lg leading-relaxed whitespace-pre-wrap">{c.about_body}</p>
            )}
          </div>
        </section>
      )}

      {/* SERVICES */}
      {services.length > 0 && (
        <section className="px-6 py-16 bg-slate-50">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold mb-8 text-center">Services</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <div key={i} className="rounded-lg bg-white p-6 shadow-sm">
                  {s.image_url && (
                    <img src={s.image_url} alt="" className="h-32 w-full object-cover rounded mb-4" />
                  )}
                  <h3 className="font-semibold text-lg">{s.title}</h3>
                  {s.description && <p className="mt-2 text-slate-600">{s.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold mb-6 text-center">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {c.phone && (
              <a href={`tel:${c.phone}`} className="block rounded border p-4 hover:bg-slate-50">
                <div className="text-sm text-slate-500">Phone</div>
                <div className="font-medium">{c.phone}</div>
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="block rounded border p-4 hover:bg-slate-50">
                <div className="text-sm text-slate-500">Email</div>
                <div className="font-medium">{c.email}</div>
              </a>
            )}
            {c.address && (
              <div className="rounded border p-4 sm:col-span-2">
                <div className="text-sm text-slate-500">Address</div>
                <div className="font-medium whitespace-pre-line">{c.address}</div>
              </div>
            )}
          </div>
          {Object.keys(hours).length > 0 && (
            <div className="mt-6 rounded border p-4">
              <div className="text-sm text-slate-500 mb-2">Hours</div>
              <ul className="text-sm">
                {Object.entries(hours).map(([d, h]) => (
                  <li key={d} className="flex justify-between py-1">
                    <span className="font-medium capitalize">{d}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 text-center text-sm text-slate-500 border-t">
        {c.footer_text || `© ${new Date().getFullYear()} ${tenant.business_name}`}
      </footer>
    </main>
  );
}

// SEO
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const host = headers().get('host') || '';
  const data = (await loadSiteByHost(host)) || (await loadSiteBySlug(params.slug));
  if (!data) return {};
  const { tenant, content } = data;
  return {
    title: content?.seo_title || tenant.business_name,
    description: content?.seo_description || '',
  };
}
