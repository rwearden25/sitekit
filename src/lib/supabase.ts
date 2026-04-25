// Browser-only Supabase client. Safe to import from client components.
// For server-side clients (cookies-based session, service-role) see supabase-server.ts.
import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = () => createBrowserClient(URL, ANON);
