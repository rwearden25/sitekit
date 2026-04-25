// Server-only Supabase clients. NEVER import from client components -- the
// next/headers import here will break the build if you do.
//
//   supabaseServer  -- cookie-aware client used in server components, server
//                       actions, and route handlers. Goes through RLS as the
//                       logged-in user.
//   supabasePublic  -- service-role client used to render public sites for
//                       anonymous visitors and from admin scripts. Bypasses
//                       RLS, so only ever query by tenant_id resolved from a
//                       trusted source (the hostname).
import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServer = () => {
  const store = cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      get: (n: string) => store.get(n)?.value,
      set: (n: string, v: string, o: CookieOptions) => {
        try { store.set({ name: n, value: v, ...o }); } catch {}
      },
      remove: (n: string, o: CookieOptions) => {
        try { store.set({ name: n, value: '', ...o }); } catch {}
      },
    },
  });
};

export const supabasePublic = () =>
  createClient(URL, SERVICE, { auth: { persistSession: false } });
