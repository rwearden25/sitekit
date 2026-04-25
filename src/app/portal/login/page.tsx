// apps/web/src/app/portal/login/page.tsx
// Magic-link login. Customer enters email -> Supabase emails them a link
// -> they click it -> they're in. No passwords to remember or reset.
// (Switch to password auth easily if you prefer; Supabase supports both.)
'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';

export default function LoginPage() {
  const sb = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/portal/auth/callback` },
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 mb-5">We'll email you a one-time login link.</p>
        {sent ? (
          <div className="text-sm text-green-700">
            Check your inbox for a sign-in link.
          </div>
        ) : (
          <form onSubmit={send} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded bg-slate-900 text-white py-2 text-sm font-medium"
            >
              Send link
            </button>
            {err && <div className="text-sm text-red-600">{err}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
