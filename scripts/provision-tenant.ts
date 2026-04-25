// Onboard a new customer.
// Usage:  npm run provision -- acme "Acme Cleaning" owner@acme.com
//
// Loads env via tsx's --env-file flag (configured in package.json's "provision" script).
// Side effects: inserts tenants row, seeds site_content, sends a Supabase invite,
// links the owner. On any failure after the tenant insert, rolls back the tenant
// (which cascades to site_content + tenant_members via the schema's ON DELETE CASCADE).
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com';

if (!URL || !SERVICE) {
  console.error(
    'Missing env. Make sure .env has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

async function main() {
  const [slug, businessName, ownerEmail] = process.argv.slice(2);
  if (!slug || !businessName || !ownerEmail) {
    console.error('Usage: npm run provision -- <slug> "<business name>" <owner email>');
    process.exit(1);
  }
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
    console.error('Slug must be 2-40 chars: lowercase letters, digits, hyphens.');
    process.exit(1);
  }

  const sb = createClient(URL!, SERVICE!, { auth: { persistSession: false } });

  // 1. create tenant
  const { data: tenant, error: tErr } = await sb
    .from('tenants')
    .insert({ slug, business_name: businessName })
    .select()
    .single();
  if (tErr) {
    console.error('Failed to create tenant:', tErr.message);
    process.exit(1);
  }
  console.log('Tenant created:', tenant.id);

  try {
    // 2. seed content
    const { error: scErr } = await sb.from('site_content').insert({
      tenant_id: tenant.id,
      hero_headline: businessName,
      hero_subheadline: 'Welcome to our site.',
    });
    if (scErr) throw new Error(`site_content seed failed: ${scErr.message}`);

    // 3. invite owner. If they already have a Supabase auth user, fall back to
    // looking them up so we can still link them as a member.
    let userId: string | null = null;
    const { data: invite, error: iErr } = await sb.auth.admin.inviteUserByEmail(ownerEmail, {
      redirectTo: `${APP_URL}/portal/auth/callback`,
    });
    if (iErr) {
      const msg = (iErr.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('registered')) {
        console.log('User already exists; looking up...');
        const { data: list, error: listErr } = await sb.auth.admin.listUsers();
        if (listErr) throw new Error(`listUsers: ${listErr.message}`);
        const existing = list.users.find((u) => u.email?.toLowerCase() === ownerEmail.toLowerCase());
        if (!existing) throw new Error('Invite reported user exists but lookup failed.');
        userId = existing.id;
      } else {
        throw new Error(`invite: ${iErr.message}`);
      }
    } else {
      userId = invite.user?.id ?? null;
    }
    if (!userId) throw new Error('Could not determine user id for owner.');

    // 4. link as tenant owner
    const { error: mErr } = await sb.from('tenant_members').insert({
      tenant_id: tenant.id,
      user_id: userId,
      role: 'owner',
    });
    if (mErr) throw new Error(`membership: ${mErr.message}`);

    console.log(`\nDone.`);
    console.log(`  Editor:  ${APP_URL}`);
    console.log(`  Public:  https://${slug}.${ROOT_DOMAIN}\n`);
  } catch (err: any) {
    console.error('Provisioning failed:', err.message);
    console.error('Rolling back tenant...');
    await sb.from('tenants').delete().eq('id', tenant.id);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
