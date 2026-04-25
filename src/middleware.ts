// Routes traffic based on hostname:
//   portal.yourdomain.com/*  -> /portal/*    (the editor app)
//   acme.yourdomain.com/*    -> /site/<slug or host>/*
//   yourdomain.com           -> /            (marketing root)
//
// On portal requests we also refresh the Supabase auth cookie via @supabase/ssr,
// so logged-in sessions stay alive across requests.
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

  if (ctx.kind === 'portal') {
    // Pass the rewritten pathname to server components via a header,
    // so the portal layout can detect /portal/login and skip its auth redirect.
    const targetPath = url.pathname.startsWith('/portal')
      ? url.pathname
      : `/portal${url.pathname}`;

    const reqHeaders = new Headers(req.headers);
    reqHeaders.set('x-pathname', targetPath);

    let res: NextResponse;
    if (!url.pathname.startsWith('/portal')) {
      url.pathname = `/portal${url.pathname}`;
      res = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
    } else {
      res = NextResponse.next({ request: { headers: reqHeaders } });
    }

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
    return res;
  }

  if (ctx.kind === 'site') {
    if (!url.pathname.startsWith('/site/')) {
      url.pathname = `/site/${ctx.slug}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}
