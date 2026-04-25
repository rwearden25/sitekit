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
  const [state, setState] = useState<'pending' | 'error'>('pending');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const sb = supabaseBrowser();
    (async () => {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : '';
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        const { error } = await sb.auth.setSession({ access_token, refresh_token });
        if (error) {
          setErrMsg(error.message);
          setState('error');
          return;
        }
      }

      const { data } = await sb.auth.getSession();
      if (data.session) {
        router.replace('/portal');
        router.refresh();
      } else {
        setErrMsg("That link isn't valid anymore. Please request a new one.");
        setState('error');
        setTimeout(() => router.replace('/portal/login'), 3000);
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        {state === 'pending' ? (
          <>
            <div className="text-lg font-semibold text-slate-900">Signing you in…</div>
            <div className="mt-1 text-sm text-slate-500">One moment.</div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold text-red-700">Sign-in failed</div>
            <div className="mt-1 text-sm text-slate-600">{errMsg}</div>
            <div className="mt-3 text-xs text-slate-500">Sending you back to the sign-in page…</div>
          </>
        )}
      </div>
    </div>
  );
}
