// apps/web/src/app/portal/account/page.tsx
// Customer self-serve: change password, see their email.
'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';

export default function AccountPage() {
  const sb = supabaseBrowser();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''));
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const { error } = await sb.auth.updateUser({ password: pw });
    setMsg(error ? `Error: ${error.message}` : 'Password updated.');
    if (!error) setPw('');
  }

  async function emailReset() {
    setMsg('');
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal/account`,
    });
    setMsg(error ? `Error: ${error.message}` : 'Reset email sent.');
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="rounded-lg border bg-white p-5">
        <div className="text-sm text-slate-500">Signed in as</div>
        <div className="font-medium">{email}</div>
      </div>

      <form onSubmit={changePassword} className="rounded-lg border bg-white p-5 space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password (min 8 chars)"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm font-medium">
          Update
        </button>
      </form>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="font-semibold mb-2">Forgot it?</h2>
        <p className="text-sm text-slate-600 mb-3">Email yourself a reset link.</p>
        <button onClick={emailReset} className="rounded border px-4 py-2 text-sm">
          Send reset email
        </button>
      </div>

      {msg && <div className="text-sm text-slate-700">{msg}</div>}
    </div>
  );
}
