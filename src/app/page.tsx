import Link from 'next/link';

const MAILTO = 'mailto:info@rockstandard.ai?subject=I%20want%20a%20SiteKit%20site';

const BUSINESSES = [
  'restaurants',
  'barbers',
  'cleaners',
  'plumbers',
  'salons',
  'mechanics',
  'cafés',
  'bakeries',
  'landscapers',
  'tutors',
  'electricians',
  'florists',
];

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-stone-900 selection:text-stone-50">
      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-20 bg-stone-50/75 backdrop-blur-md border-b border-stone-200/60">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 h-14 flex items-center justify-between">
          <Link href="/" className="font-display text-lg tracking-tight">
            SiteKit<span className="text-stone-400">.</span>
          </Link>
          <Link
            href="/portal"
            className="text-sm text-stone-600 hover:text-stone-900 underline-offset-4 hover:underline transition-colors"
          >
            Customer portal <span aria-hidden>→</span>
          </Link>
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="pt-40 sm:pt-52 pb-24 sm:pb-32 px-6 sm:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-4xl">
              <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-stone-500 mb-10 sm:mb-14">
                <span className="inline-block w-8 border-t border-stone-400" />
                Est. 2026 — small business websites
              </p>
              <h1 className="font-display font-light tracking-tight leading-[0.92] text-[clamp(3.25rem,10vw,8rem)]">
                <span className="block">A small website.</span>
                <span className="block italic text-stone-700">No fuss.</span>
              </h1>
              <p className="mt-10 sm:mt-14 max-w-xl text-base sm:text-lg leading-relaxed text-stone-600">
                We design and host one-page sites for small businesses, then hand
                you a simple editor so you can update them yourself. Nothing to
                install. Nothing to learn.
              </p>
              <div className="mt-10 sm:mt-12 flex flex-wrap items-center gap-x-7 gap-y-4">
                <a
                  href={MAILTO}
                  className="group inline-flex items-center gap-2 rounded-full bg-stone-900 px-7 py-3.5 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors"
                >
                  Get a site
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </a>
                <Link
                  href="/site/test"
                  className="text-sm text-stone-700 underline underline-offset-[6px] decoration-stone-300 hover:decoration-stone-900 transition-colors"
                >
                  See an example
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* marquee */}
        <section aria-hidden className="overflow-hidden border-y border-stone-200 py-7 bg-stone-100/50">
          <div className="flex w-max animate-marquee-x">
            {[0, 1].map((i) => (
              <ul key={i} className="flex shrink-0 items-center gap-12 pr-12 text-2xl sm:text-3xl font-display italic font-light text-stone-400">
                {BUSINESSES.map((biz) => (
                  <li key={`${i}-${biz}`} className="flex items-center gap-12">
                    <span>{biz}</span>
                    <span className="text-stone-300">·</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="px-6 sm:px-10 py-24 sm:py-36">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-16 sm:mb-24">
              <h2 className="font-display font-light text-4xl sm:text-5xl tracking-tight leading-none">
                How it <span className="italic text-stone-600">works.</span>
              </h2>
              <p className="hidden sm:block text-xs uppercase tracking-[0.22em] text-stone-500">
                Three steps
              </p>
            </div>

            <div className="grid gap-x-12 gap-y-16 sm:grid-cols-3">
              {[
                {
                  num: '01',
                  title: 'We build it',
                  body: 'You hand over a couple of photos, your hours, and a sentence about what you do. We design and publish your one-page site within a day.',
                },
                {
                  num: '02',
                  title: 'You edit it',
                  body: 'Sign in any time to a simple form. Change a phone number, swap a photo, add a service. No web designer to call.',
                },
                {
                  num: '03',
                  title: 'It just works',
                  body: 'Mobile-first, fast, secure, hosted. We take care of the boring parts so you can get back to running your business.',
                },
              ].map((step) => (
                <div key={step.num}>
                  <div className="font-display italic font-light text-stone-400 text-4xl mb-5">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-medium tracking-tight">{step.title}</h3>
                  <p className="mt-3 text-stone-600 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* what's included — quiet bullet list */}
        <section className="px-6 sm:px-10 py-24 sm:py-32 border-t border-stone-200">
          <div className="mx-auto max-w-6xl grid gap-12 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <h2 className="font-display font-light text-3xl sm:text-4xl tracking-tight leading-tight">
                Everything you need.
                <span className="block italic text-stone-500">Nothing you don't.</span>
              </h2>
            </div>
            <div className="sm:col-span-7">
              <dl className="divide-y divide-stone-200">
                {[
                  ['Mobile-first design', 'Looks right on the phones your customers actually use.'],
                  ['Self-serve editor', 'Edit copy, hours, photos, and services from a clean form.'],
                  ['Image library', 'Upload once, reuse anywhere. We host the photos.'],
                  ['Fast and hosted', 'Free SSL, fast page loads, no plugins to update.'],
                  ['Your own domain', 'Or a free yourbusiness.sitekit.app subdomain to start.'],
                  ['Email sign-in', 'No password to remember. Magic link to your inbox.'],
                ].map(([title, body]) => (
                  <div key={title} className="flex flex-col sm:flex-row gap-1 sm:gap-8 py-5">
                    <dt className="sm:w-56 shrink-0 font-medium tracking-tight">{title}</dt>
                    <dd className="text-stone-600 leading-relaxed">{body}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* closing CTA */}
        <section className="px-6 sm:px-10 py-28 sm:py-40 border-t border-stone-200">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-display font-light text-4xl sm:text-6xl leading-[1.05] tracking-tight">
              <span className="italic text-stone-500">Ready when</span>
              <br />
              you are.
            </p>
            <a
              href={MAILTO}
              className="mt-12 sm:mt-14 inline-flex items-center gap-2 rounded-full bg-stone-900 px-8 py-4 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              Get a site
              <span aria-hidden>→</span>
            </a>
            <p className="mt-6 text-xs text-stone-500">
              Or email{' '}
              <a href="mailto:info@rockstandard.ai" className="underline underline-offset-4 hover:text-stone-800">
                info@rockstandard.ai
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 px-6 sm:px-10 py-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-stone-500">
          <div className="font-display italic">SiteKit, {new Date().getFullYear()}.</div>
          <div className="flex gap-5">
            <Link href="/portal" className="hover:text-stone-800 transition-colors">Portal</Link>
            <a href={MAILTO} className="hover:text-stone-800 transition-colors">Get a site</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
