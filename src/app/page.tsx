// Marketing placeholder shown at the root domain (e.g. yourdomain.com).
// Customer sites live at <slug>.yourdomain.com; the editor lives at portal.yourdomain.com.
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">SiteKit</h1>
        <p className="mt-3 text-slate-600">
          One-page sites for small businesses. Customers manage their own content
          through a self-serve portal.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/portal" className="rounded-md bg-slate-900 px-4 py-2 text-white text-sm font-medium">
            Customer portal
          </Link>
        </div>
      </div>
    </main>
  );
}
