'use client';
// Magic-link login. Customer enters email, Supabase emails them a link.
// No passwords to remember; the customer can also set one later from /portal/account.
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';

export default function LoginPage() {
  const sb = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/portal/auth/callback` },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in to your site</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your email and we'll send you a one-time sign-in link. No password needed.
        </p>
        {sent ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              ✓ Sign-in link sent to <span className="font-medium">{email}</span>.
            </div>
            <p className="text-xs text-slate-500">
              The email may take a minute to arrive. Check your spam folder if you don't see it.
              The link expires in 1 hour.
            </p>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-xs text-slate-600 underline hover:text-slate-900"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Email address</span>
              <input
                type="email"
                required
                autoFocus
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-slate-900 text-white py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send sign-in link'}
            </button>
            {err && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                {err}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
