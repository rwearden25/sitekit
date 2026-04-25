// Authenticated shell for the customer self-serve portal.
// Anything inside /portal/* requires a logged-in user with at least one tenant
// membership -- EXCEPT /portal/login itself, which is detected via the
// x-pathname header set by middleware to avoid an auth redirect loop.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase-server';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get('x-pathname') || '';
  const isPublicRoute =
    pathname === '/portal/login' ||
    pathname.startsWith('/portal/login/') ||
    pathname.startsWith('/portal/auth/');

  if (isPublicRoute) {
    // Render the login / auth-callback pages bare -- no auth check, no nav header.
    return <>{children}</>;
  }

  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) redirect('/portal/login');

  const { data: memberships } = await sb
    .from('tenant_members')
    .select('tenant_id, role, tenants(business_name, slug, custom_domain)')
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <h1 className="text-xl font-semibold">No site assigned</h1>
        <p className="mt-2 text-slate-600">
          Your account isn't linked to a site yet. Contact your administrator.
        </p>
        <form action="/api/auth/signout" method="post" className="mt-4">
          <button className="text-sm text-slate-600 underline">Sign out</button>
        </form>
      </div>
    );
  }

  const t = memberships[0].tenants as any;
  const publicHost = t.custom_domain || `${t.slug}.${ROOT_DOMAIN}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">{t.business_name}</div>
            <a
              href={`https://${publicHost}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              View live site: {publicHost} ↗
            </a>
          </div>
          <nav className="flex gap-2 text-sm">
            <Link href="/portal" className="px-3 py-1.5 rounded hover:bg-slate-100">Edit</Link>
            <Link href="/portal/media" className="px-3 py-1.5 rounded hover:bg-slate-100">Media</Link>
            <Link href="/portal/account" className="px-3 py-1.5 rounded hover:bg-slate-100">Account</Link>
            <form action="/api/auth/signout" method="post">
              <button className="px-3 py-1.5 rounded hover:bg-slate-100">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
