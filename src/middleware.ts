// Routes traffic based on hostname:
//   portal.yourdomain.com/*  -> /portal/*    (the editor app)
//   acme.yourdomain.com/*    -> /site/<slug or host>/*
//   yourdomain.com           -> /            (marketing root)
//
// On portal-bound requests we also refresh the Supabase auth cookie via
// @supabase/ssr so logged-in sessions stay alive across requests. The
// x-pathname header is always set so the portal layout can detect
// /portal/login and /portal/auth/* and skip the auth redirect.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { resolveHost } from './lib/tenant';

export const config = {
  matcher: ['/((?!_next/|api/|favicon.ico|robots.txt).*)'],
};

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const ctx = resolveHost(host);
  const url = req.nextUrl.clone();

  // Compute the path that will actually be rendered, after any rewrite.
  let renderedPath = url.pathname;
  if (ctx.kind === 'portal' && !url.pathname.startsWith('/portal')) {
    renderedPath = `/portal${url.pathname}`;
  } else if (ctx.kind === 'site' && !url.pathname.startsWith('/site/')) {
    renderedPath = `/site/${ctx.slug}${url.pathname}`;
  }

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-pathname', renderedPath);

  // Build the response (rewrite or pass-through), preserving x-pathname.
  let res: NextResponse;
  if (ctx.kind === 'portal' && !url.pathname.startsWith('/portal')) {
    url.pathname = renderedPath;
    res = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
  } else if (ctx.kind === 'site' && !url.pathname.startsWith('/site/')) {
    url.pathname = renderedPath;
    res = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
  } else {
    res = NextResponse.next({ request: { headers: reqHeaders } });
  }

  // Refresh the Supabase session for any path that lives under /portal.
  // Covers both subdomain-driven and direct-path-driven portal access.
  if (renderedPath.startsWith('/portal')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => req.cookies.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) =>
            res.cookies.set({ name, value, ...options }),
          remove: (name: string, options: CookieOptions) =>
            res.cookies.set({ name, value: '', ...options }),
        },
      }
    );
    await supabase.auth.getUser();
  }

  return res;
}
