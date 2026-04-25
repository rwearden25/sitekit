'use client';
// Account page: see your email, set or change a password, request a reset.
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';

export default function AccountPage() {
  const sb = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''));
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message });
    else { setMsg({ ok: true, text: 'Password updated. You can now sign in with it next time.' }); setPw(''); }
  }

  async function emailReset() {
    setMsg(null);
    setBusy(true);
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal/account`,
    });
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message });
    else setMsg({ ok: true, text: 'Reset email sent. Check your inbox in a minute.' });
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Your account</h2>
        <div className="mt-3 text-sm text-slate-500">Signed in as</div>
        <div className="font-medium">{email || '…'}</div>
      </div>

      <form onSubmit={changePassword} className="rounded-lg border bg-white p-5 space-y-3">
        <div>
          <h2 className="font-semibold">Set or change password</h2>
          <p className="mt-1 text-sm text-slate-500">
            You signed in with a one-time link. Setting a password lets you sign in with email + password too.
          </p>
        </div>
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password (min 8 characters)"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          disabled={busy || pw.length < 8}
          className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Trouble signing in?</h2>
        <p className="mt-1 text-sm text-slate-500">
          We'll email you a fresh sign-in link. Use this if you get locked out or forget your password.
        </p>
        <button
          onClick={emailReset}
          disabled={busy || !email}
          className="mt-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Email me a new sign-in link
        </button>
      </div>

      {msg && (
        <div className={`rounded-md px-4 py-3 text-sm ${msg.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
