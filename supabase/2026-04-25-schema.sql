-- ============================================================================
-- SiteKit: multi-tenant one-page site builder + self-serve portal
-- Backend schema for Supabase / Postgres
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TENANTS (one row per customer site)
-- ----------------------------------------------------------------------------
create table if not exists public.tenants (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,           -- e.g. "acme" -> acme.yourdomain.com
  custom_domain   text unique,                    -- optional: acmecleaning.com
  business_name   text not null,
  plan            text not null default 'starter',-- starter | pro | etc.
  status          text not null default 'active', -- active | suspended | trial
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tenants_slug_idx on public.tenants (slug);
create index if not exists tenants_custom_domain_idx on public.tenants (custom_domain);

-- ----------------------------------------------------------------------------
-- TENANT MEMBERSHIPS (which auth users can edit which tenant)
-- ----------------------------------------------------------------------------
create table if not exists public.tenant_members (
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner',  -- owner | editor
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- ----------------------------------------------------------------------------
-- SITE CONTENT (the actual editable site -- one row per tenant)
-- Stored as JSONB so customers can self-serve without schema migrations.
-- ----------------------------------------------------------------------------
create table if not exists public.site_content (
  tenant_id     uuid primary key references public.tenants(id) on delete cascade,
  -- Hero / header
  hero_headline   text,
  hero_subheadline text,
  hero_image_url  text,
  hero_cta_label  text default 'Get a Quote',
  hero_cta_link   text,
  -- About / body
  about_title     text,
  about_body      text,
  -- Contact
  phone           text,
  email           text,
  address         text,
  hours_json      jsonb default '{}'::jsonb,  -- { "mon": "8-5", "tue": "8-5", ... }
  -- Services list (array of {title, description, image_url})
  services_json   jsonb default '[]'::jsonb,
  -- Branding
  brand_primary   text default '#0f172a',
  brand_accent    text default '#2563eb',
  logo_url        text,
  -- Footer
  footer_text     text,
  social_json     jsonb default '{}'::jsonb,  -- { "facebook": "...", "instagram": "..." }
  -- Meta
  seo_title       text,
  seo_description text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id)
);

-- ----------------------------------------------------------------------------
-- MEDIA (images uploaded via portal -> Supabase Storage)
-- ----------------------------------------------------------------------------
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  storage_path text not null,                 -- path in Supabase Storage bucket
  public_url   text not null,
  filename     text,
  size_bytes   bigint,
  content_type text,
  uploaded_by  uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
create index if not exists media_tenant_idx on public.media (tenant_id);

-- ----------------------------------------------------------------------------
-- AUDIT LOG (who changed what, when)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          bigserial primary key,
  tenant_id   uuid references public.tenants(id) on delete cascade,
  user_id     uuid references auth.users(id),
  action      text not null,        -- 'content.update' | 'media.upload' | 'media.delete'
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_tenant_idx on public.audit_log (tenant_id, created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tenants_touch on public.tenants;
create trigger tenants_touch before update on public.tenants
  for each row execute function public.touch_updated_at();

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- A user can only see/edit tenants they're a member of.
-- The PUBLIC site read happens via service-role key in server components,
-- so anonymous visitors don't need direct table access.
-- ----------------------------------------------------------------------------
alter table public.tenants         enable row level security;
alter table public.tenant_members  enable row level security;
alter table public.site_content    enable row level security;
alter table public.media           enable row level security;
alter table public.audit_log       enable row level security;

-- Helper: is the calling user a member of this tenant?
create or replace function public.is_tenant_member(t uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = t and user_id = auth.uid()
  );
$$;

-- tenants: members can select their tenants
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select using (public.is_tenant_member(id));

-- tenants_update intentionally NOT created.
-- Customers can read their tenant row but cannot self-edit plan/status/slug/custom_domain.
-- Use the service-role key (admin tooling) to change those.
drop policy if exists tenants_update on public.tenants;

-- tenant_members: a user can see their own memberships
drop policy if exists tm_select on public.tenant_members;
create policy tm_select on public.tenant_members
  for select using (user_id = auth.uid());

-- site_content: members can read & write
drop policy if exists sc_select on public.site_content;
create policy sc_select on public.site_content
  for select using (public.is_tenant_member(tenant_id));

drop policy if exists sc_update on public.site_content;
create policy sc_update on public.site_content
  for update using (public.is_tenant_member(tenant_id));

drop policy if exists sc_insert on public.site_content;
create policy sc_insert on public.site_content
  for insert with check (public.is_tenant_member(tenant_id));

-- media: members can read & write their tenant's media
drop policy if exists media_all on public.media;
create policy media_all on public.media
  for all using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

-- audit_log: members can read their tenant's log AND insert their own rows.
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select using (public.is_tenant_member(tenant_id));

drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert with check (
    public.is_tenant_member(tenant_id) and user_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- STORAGE BUCKET (run once in Supabase dashboard or via SQL)
-- ----------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public) values ('site-media','site-media', true)
--   on conflict do nothing;
--
-- Storage RLS policies (run in Supabase Storage policy editor):
--   - SELECT: public (so site visitors can load images)
--   - INSERT/UPDATE/DELETE: authenticated AND path starts with tenant uuid
--     using ( (storage.foldername(name))[1]::uuid in
--             (select tenant_id from tenant_members where user_id = auth.uid()) )
