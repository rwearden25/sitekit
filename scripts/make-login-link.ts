// Generate a magic-link URL for an existing user without sending email.
// Useful when Supabase email rate limits hit, or for headless dev work.
//
// Usage:  npm run login-link -- you@example.com
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!URL || !SERVICE) {
  console.error('Missing env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run login-link -- <email>');
    process.exit(1);
  }
  const sb = createClient(URL!, SERVICE!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${APP_URL}/portal/auth/callback` },
  });
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  const link = data.properties?.action_link;
  if (!link) {
    console.error('No link returned. Make sure the user exists.');
    process.exit(1);
  }
  console.log('\nClick this link to sign in (paste into your browser):\n');
  console.log(link);
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });
