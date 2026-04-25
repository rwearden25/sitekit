'use client';
// Catches the auth hash fragment Supabase appends after a magic-link verify.
// The implicit flow redirects to /portal/auth/callback#access_token=...&refresh_token=...
// The browser SDK detects this on mount, persists the session via cookies
// (handled by @supabase/ssr's createBrowserClient), then we navigate to the editor.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      // If Supabase put tokens in the hash, parse and store them.
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : '';
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        const { error } = await sb.auth.setSession({ access_token, refresh_token });
        if (error) {
          setMsg(`Sign-in failed: ${error.message}`);
          return;
        }
      }

      // Confirm session exists, then go to the editor.
      const { data } = await sb.auth.getSession();
      if (data.session) {
        router.replace('/portal');
        router.refresh();
      } else {
        setMsg('No session found. Please request a new sign-in link.');
        setTimeout(() => router.replace('/portal/login'), 2500);
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-slate-700">{msg}</div>
    </div>
  );
}
