// Browser-only Supabase client. Safe to import from client components.
// For server-side clients (cookies-based session, service-role) see supabase-server.ts.
//
// Cached as a module-level singleton: constructing createBrowserClient on every
// render stacks up GoTrue auth instances that each call history.replaceState
// during hash cleanup, producing an infinite render loop on hydration.
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let client: SupabaseClient | undefined;

export const supabaseBrowser = () => {
  if (!client) client = createBrowserClient(URL, ANON);
  return client;
};
