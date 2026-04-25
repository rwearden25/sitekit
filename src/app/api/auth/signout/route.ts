import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const sb = supabaseServer();
  await sb.auth.signOut();
  // Redirect on the SAME origin the request came from -- so localhost stays
  // on localhost, and prod stays on prod.
  return NextResponse.redirect(new URL('/portal/login', req.url));
}
