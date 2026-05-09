create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ----------
-- Types
-- ----------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('owner', 'admin', 'member');
  end if;
end $$;

-- ----------
-- Core tenant and access tables
-- ----------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  domain text null,
  contact_email text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text null,
  avatar_url text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key public.app_role not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_tenant_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  is_active boolean not null default true,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_tenant_roles_unique unique (tenant_id, user_id)
);

create table if not exists public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email citext not null,
  role_id uuid not null references public.roles(id) on delete restrict,
  token_hash text not null unique,
  invited_by uuid null references public.users(id) on delete set null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_invites_status_valid check (status in ('pending', 'accepted', 'revoked', 'expired'))
);

-- ----------
-- Triggers and helper functions
-- ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$ begin
  new.updated_at := now();
  return new;
end; $$;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id from public.users u where u.auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_tenant_roles utr
    where utr.tenant_id = p_tenant_id
      and utr.user_id = public.current_app_user_id()
      and utr.is_active = true
  );
$$;

create or replace function public.has_tenant_role(p_tenant_id uuid, p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_tenant_roles utr
    join public.roles r on r.id = utr.role_id
    where utr.tenant_id = p_tenant_id
      and utr.user_id = public.current_app_user_id()
      and utr.is_active = true
      and r.key = any(p_roles)
  );
$$;

create or replace function public.ensure_app_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_id uuid := auth.uid();
  v_email text;
  v_user_id uuid;
begin
  if v_auth_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(nullif(email, ''), concat('unknown+', v_auth_id::text, '@local.invalid'))
  into v_email
  from auth.users where id = v_auth_id;

  insert into public.users (auth_user_id, email)
  values (v_auth_id, v_email)
  on conflict (auth_user_id) do update set email = excluded.email, updated_at = now()
  returning id into v_user_id;

  return v_user_id;
end;
$$;

create or replace function public.ensure_user_tenant(p_tenant_slug text default null)
returns table (tenant_id uuid, tenant_slug text, tenant_name text, role_key public.app_role)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid;
  v_email text;
  v_slug_base text;
  v_slug text;
  v_tenant_id uuid;
begin
  v_app_user_id := public.ensure_app_user();

  select u.email into v_email from public.users u where u.id = v_app_user_id;

  if p_tenant_slug is not null then
    return query
    select t.id, t.slug, t.name, r.key
    from public.user_tenant_roles utr
    join public.tenants t on t.id = utr.tenant_id
    join public.roles r on r.id = utr.role_id
    where utr.user_id = v_app_user_id and utr.is_active = true and t.slug = p_tenant_slug
    limit 1;
    if found then
      return;
    end if;
  end if;

  return query
  select t.id, t.slug, t.name, r.key
  from public.user_tenant_roles utr
  join public.tenants t on t.id = utr.tenant_id
  join public.roles r on r.id = utr.role_id
  where utr.user_id = v_app_user_id and utr.is_active = true
  order by utr.created_at asc
  limit 1;

  if found then
    return;
  end if;

  v_slug_base := regexp_replace(lower(split_part(v_email, '@', 1)), '[^a-z0-9]+', '-', 'g');
  v_slug_base := trim(both '-' from v_slug_base);
  if v_slug_base = '' then v_slug_base := 'workspace'; end if;
  v_slug := concat(v_slug_base, '-', substring(replace(v_app_user_id::text, '-', '') from 1 for 6));

  insert into public.tenants (slug, name, domain, contact_email, created_by)
  values (v_slug, concat(initcap(replace(v_slug_base, '-', ' ')), ' Workspace'), split_part(v_email, '@', 2), v_email, auth.uid())
  on conflict (slug) do nothing;

  select id into v_tenant_id from public.tenants where slug = v_slug limit 1;

  insert into public.user_tenant_roles (tenant_id, user_id, role_id)
  select v_tenant_id, v_app_user_id, r.id
  from public.roles r where r.key = 'owner'
  on conflict on constraint user_tenant_roles_unique
  do update set role_id = excluded.role_id, is_active = true, updated_at = now();

  return query
  select t.id, t.slug, t.name, 'owner'::public.app_role from public.tenants t where t.id = v_tenant_id;
end;
$$;

create or replace function public.create_tenant_invite(
  p_tenant_id uuid,
  p_email text,
  p_role_id uuid
)
returns table (invite_id uuid, email text, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_app_user_id();
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz := now() + interval '72 hours';
  v_invite_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_tenant_role(p_tenant_id, array['owner','admin']::public.app_role[]) then
    raise exception 'Forbidden';
  end if;

  update public.tenant_invites
  set status = 'revoked', updated_at = now()
  where tenant_id = p_tenant_id
    and lower(email::text) = lower(trim(p_email))
    and status = 'pending';

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.tenant_invites (tenant_id, email, role_id, token_hash, invited_by, status, expires_at)
  values (p_tenant_id, lower(trim(p_email)), p_role_id, v_token_hash, v_actor, 'pending', v_expires_at)
  returning id into v_invite_id;

  return query select v_invite_id, lower(trim(p_email)), v_token, v_expires_at;
end;
$$;

create or replace function public.accept_tenant_invite(p_token text)
returns table (tenant_id uuid, tenant_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.ensure_app_user();
  v_token_hash text;
  v_invite public.tenant_invites%rowtype;
begin
  if coalesce(trim(p_token), '') = '' then
    raise exception 'Invite token is required';
  end if;

  v_token_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select * into v_invite
  from public.tenant_invites i
  where i.token_hash = v_token_hash
    and i.status = 'pending'
  limit 1;

  if v_invite.id is null then
    raise exception 'Invite is invalid or already used';
  end if;

  if v_invite.expires_at < now() then
    update public.tenant_invites set status = 'expired', updated_at = now() where id = v_invite.id;
    raise exception 'Invite has expired';
  end if;

  insert into public.user_tenant_roles (tenant_id, user_id, role_id, is_active)
  values (v_invite.tenant_id, v_actor, v_invite.role_id, true)
  on conflict on constraint user_tenant_roles_unique
  do update set role_id = excluded.role_id, is_active = true, updated_at = now();

  update public.tenant_invites
  set status = 'accepted', accepted_at = now(), updated_at = now()
  where id = v_invite.id;

  return query
  select t.id, t.slug from public.tenants t where t.id = v_invite.tenant_id;
end;
$$;

-- updated_at triggers
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenants','users','user_tenant_roles','tenant_invites']
  LOOP
    EXECUTE format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    EXECUTE format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  END LOOP;
END $$;

-- ----------
-- Indexes
-- ----------
create index if not exists idx_user_tenant_roles_tenant on public.user_tenant_roles(tenant_id, is_active);
create index if not exists idx_user_tenant_roles_user on public.user_tenant_roles(user_id, is_active);
create index if not exists idx_tenant_invites_tenant_status on public.tenant_invites(tenant_id, status, created_at desc);

-- ----------
-- Seed roles
-- ----------
insert into public.roles (key, label)
values
  ('owner', 'Owner'),
  ('admin', 'Admin'),
  ('member', 'Member')
on conflict (key) do nothing;

-- ----------
-- RLS
-- ----------
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.user_tenant_roles enable row level security;
alter table public.tenant_invites enable row level security;

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated on public.roles
for select to authenticated using (true);

drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_member on public.tenants
for select using (public.is_tenant_member(id));

drop policy if exists tenants_update_admin on public.tenants;
create policy tenants_update_admin on public.tenants
for update
using (public.has_tenant_role(id, array['owner','admin']::public.app_role[]))
with check (public.has_tenant_role(id, array['owner','admin']::public.app_role[]));

drop policy if exists users_select_member on public.users;
create policy users_select_member on public.users
for select
using (
  exists (
    select 1
    from public.user_tenant_roles self_utr
    join public.user_tenant_roles target_utr
      on target_utr.tenant_id = self_utr.tenant_id
      and target_utr.user_id = users.id
    where self_utr.user_id = public.current_app_user_id()
      and self_utr.is_active = true
      and target_utr.is_active = true
  )
  or users.id = public.current_app_user_id()
);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
for update using (users.id = public.current_app_user_id())
with check (users.id = public.current_app_user_id());

drop policy if exists user_tenant_roles_select_member on public.user_tenant_roles;
create policy user_tenant_roles_select_member on public.user_tenant_roles
for select using (public.is_tenant_member(tenant_id));

drop policy if exists user_tenant_roles_insert_admin on public.user_tenant_roles;
create policy user_tenant_roles_insert_admin on public.user_tenant_roles
for insert
with check (public.is_tenant_member(tenant_id) and public.has_tenant_role(tenant_id, array['owner','admin']::public.app_role[]));

drop policy if exists user_tenant_roles_update_admin on public.user_tenant_roles;
create policy user_tenant_roles_update_admin on public.user_tenant_roles
for update
using (public.is_tenant_member(tenant_id) and public.has_tenant_role(tenant_id, array['owner','admin']::public.app_role[]))
with check (public.is_tenant_member(tenant_id) and public.has_tenant_role(tenant_id, array['owner','admin']::public.app_role[]));

drop policy if exists user_tenant_roles_delete_admin on public.user_tenant_roles;
create policy user_tenant_roles_delete_admin on public.user_tenant_roles
for delete
using (public.is_tenant_member(tenant_id) and public.has_tenant_role(tenant_id, array['owner','admin']::public.app_role[]));

drop policy if exists tenant_invites_select_member on public.tenant_invites;
create policy tenant_invites_select_member on public.tenant_invites
for select using (public.is_tenant_member(tenant_id));

drop policy if exists tenant_invites_insert_admin on public.tenant_invites;
create policy tenant_invites_insert_admin on public.tenant_invites
for insert
with check (public.is_tenant_member(tenant_id) and public.has_tenant_role(tenant_id, array['owner','admin']::public.app_role[]));

drop policy if exists tenant_invites_update_admin on public.tenant_invites;
create policy tenant_invites_update_admin on public.tenant_invites
for update
using (public.is_tenant_member(tenant_id) and public.has_tenant_role(tenant_id, array['owner','admin']::public.app_role[]))
with check (public.is_tenant_member(tenant_id) and public.has_tenant_role(tenant_id, array['owner','admin']::public.app_role[]));

drop policy if exists tenant_invites_delete_admin on public.tenant_invites;
create policy tenant_invites_delete_admin on public.tenant_invites
for delete
using (public.is_tenant_member(tenant_id) and public.has_tenant_role(tenant_id, array['owner','admin']::public.app_role[]));

-- ----------
-- RPC grants
-- ----------
grant execute on function public.ensure_app_user() to authenticated;
grant execute on function public.ensure_user_tenant(text) to authenticated;
grant execute on function public.create_tenant_invite(uuid, text, uuid) to authenticated;
grant execute on function public.accept_tenant_invite(text) to authenticated;

-- Optional cleanup for old installs
drop function if exists public.accept_organization_invite(text);
drop function if exists public.create_organization_invite(uuid, text, public.organization_role, int);
drop function if exists public.ensure_user_organization();
drop function if exists public.get_my_primary_org();
drop function if exists public.is_org_member(uuid, public.organization_role[]);
drop type if exists public.organization_role;
drop table if exists public.organization_invites cascade;
drop table if exists public.organization_members cascade;
drop table if exists public.organizations cascade;
