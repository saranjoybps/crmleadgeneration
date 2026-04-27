create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ----------
-- Types
-- ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'organization_role') then
    create type public.organization_role as enum ('owner', 'admin', 'member');
  end if;
end $$;

-- ----------
-- Core Tables
-- ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  contact_email text null,
  phone text null,
  mobile text null,
  website text null,
  address text null,
  city text null,
  state text null,
  people_range text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table if exists public.organizations add column if not exists contact_email text null;
alter table if exists public.organizations add column if not exists phone text null;
alter table if exists public.organizations add column if not exists mobile text null;
alter table if exists public.organizations add column if not exists website text null;
alter table if exists public.organizations add column if not exists address text null;
alter table if exists public.organizations add column if not exists city text null;
alter table if exists public.organizations add column if not exists state text null;
alter table if exists public.organizations add column if not exists people_range text null;

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email citext not null,
  role public.organization_role not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_status_valid check (status in ('active', 'invited', 'suspended')),
  constraint organization_members_unique_user unique (organization_id, user_id),
  constraint organization_members_unique_email unique (organization_id, email)
);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null,
  role public.organization_role not null default 'member',
  token_hash text not null unique,
  invited_by uuid null references auth.users(id) on delete set null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  accepted_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_invites_status_valid check (status in ('pending', 'accepted', 'revoked', 'expired'))
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  industries jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  location text not null default '',
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  phone text null,
  email text null,
  website text null,
  source text not null,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ----------
-- Legacy Compatibility + Backfill
-- ----------
alter table if exists public.campaigns add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table if exists public.campaigns add column if not exists created_by uuid references auth.users(id) on delete set null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'campaigns'
      and column_name = 'user_id'
  ) then
    execute '
      update public.campaigns
      set created_by = user_id
      where created_by is null and user_id is not null
    ';
  end if;
end $$;

insert into public.organizations (slug, name, created_by)
select
  concat('org-', substring(replace(u.id::text, '-', '') from 1 for 8)),
  concat(coalesce(nullif(split_part(u.email, '@', 1), ''), 'Workspace'), ' Workspace'),
  u.id
from auth.users u
where exists (
  select 1
  from public.campaigns c
  where c.created_by = u.id
)
on conflict (slug) do nothing;

insert into public.organization_members (organization_id, user_id, email, role, status)
select
  o.id,
  u.id,
  coalesce(nullif(u.email, ''), concat('unknown+', u.id::text, '@local.invalid')),
  'owner'::public.organization_role,
  'active'
from public.organizations o
join auth.users u on u.id = o.created_by
on conflict (organization_id, user_id)
do update set
  email = excluded.email,
  role = 'owner'::public.organization_role,
  status = 'active',
  updated_at = now();

update public.campaigns c
set organization_id = o.id
from public.organizations o
where c.organization_id is null and c.created_by = o.created_by;

update public.campaigns c
set organization_id = m.organization_id
from public.organization_members m
where c.organization_id is null
  and c.created_by = m.user_id
  and m.status = 'active';

do $$
begin
  if not exists (select 1 from public.campaigns where organization_id is null) then
    alter table public.campaigns alter column organization_id set not null;
  end if;
end $$;

drop policy if exists "campaigns_select_own" on public.campaigns;
drop policy if exists "campaigns_insert_own" on public.campaigns;
drop policy if exists "campaigns_update_own" on public.campaigns;
drop policy if exists "campaigns_delete_own" on public.campaigns;
drop policy if exists "leads_select_campaign_owner" on public.leads;
drop policy if exists "leads_insert_campaign_owner" on public.leads;
drop policy if exists "leads_update_campaign_owner" on public.leads;
drop policy if exists "leads_delete_campaign_owner" on public.leads;

alter table if exists public.campaigns drop column if exists user_id;

-- ----------
-- Indexes
-- ----------
create unique index if not exists idx_organization_members_single_org_per_user
  on public.organization_members(user_id)
  where status = 'active';

create index if not exists idx_organization_members_org_id on public.organization_members(organization_id);
create index if not exists idx_organization_members_user_id on public.organization_members(user_id);

create unique index if not exists idx_organization_invites_org_email_pending
  on public.organization_invites(organization_id, email)
  where status = 'pending';

create index if not exists idx_campaigns_organization_id on public.campaigns(organization_id);
create index if not exists idx_campaigns_created_by on public.campaigns(created_by);
create index if not exists idx_campaigns_created_at on public.campaigns(created_at desc);
create index if not exists idx_leads_campaign_id on public.leads(campaign_id);
create index if not exists idx_leads_source on public.leads(source);
create index if not exists idx_leads_name on public.leads(name);

-- ----------
-- Triggers
-- ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
before update on public.organizations
for each row execute function public.touch_updated_at();

drop trigger if exists trg_organization_members_updated_at on public.organization_members;
create trigger trg_organization_members_updated_at
before update on public.organization_members
for each row execute function public.touch_updated_at();

drop trigger if exists trg_organization_invites_updated_at on public.organization_invites;
create trigger trg_organization_invites_updated_at
before update on public.organization_invites
for each row execute function public.touch_updated_at();

-- ----------
-- Helper Functions
-- ----------
create or replace function public.is_org_member(
  p_organization_id uuid,
  p_roles public.organization_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and (
        p_roles is null
        or cardinality(p_roles) = 0
        or m.role = any(p_roles)
      )
  );
$$;

create or replace function public.get_my_primary_org()
returns table (
  organization_id uuid,
  organization_slug text,
  organization_name text,
  role public.organization_role
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.slug,
    o.name,
    m.role
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.status = 'active'
  order by m.created_at asc
  limit 1;
$$;

create or replace function public.ensure_user_organization()
returns table (
  organization_id uuid,
  organization_slug text,
  organization_name text,
  role public.organization_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_existing_org_id uuid;
  v_existing_org_slug text;
  v_existing_org_name text;
  v_existing_role public.organization_role;
  v_slug_base text;
  v_slug text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select o.id, o.slug, o.name, m.role
  into v_existing_org_id, v_existing_org_slug, v_existing_org_name, v_existing_role
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = v_user_id
    and m.status = 'active'
  order by m.created_at asc
  limit 1;

  if v_existing_org_id is not null then
    return query
    select v_existing_org_id, v_existing_org_slug, v_existing_org_name, v_existing_role;
    return;
  end if;

  select coalesce(nullif(email, ''), concat('unknown+', v_user_id::text, '@local.invalid'))
  into v_email
  from auth.users
  where id = v_user_id;

  v_slug_base := regexp_replace(lower(split_part(v_email, '@', 1)), '[^a-z0-9]+', '-', 'g');
  v_slug_base := trim(both '-' from v_slug_base);
  if v_slug_base = '' then
    v_slug_base := 'workspace';
  end if;

  v_slug := concat(v_slug_base, '-', substring(replace(v_user_id::text, '-', '') from 1 for 6));

  insert into public.organizations (slug, name, created_by)
  values (
    v_slug,
    concat(initcap(replace(v_slug_base, '-', ' ')), ' Workspace'),
    v_user_id
  )
  on conflict (slug) do nothing;

  insert into public.organization_members (organization_id, user_id, email, role, status)
  select o.id, v_user_id, v_email, 'owner'::public.organization_role, 'active'
  from public.organizations o
  where o.slug = v_slug
  on conflict (organization_id, user_id)
  do update set
    email = excluded.email,
    role = 'owner'::public.organization_role,
    status = 'active',
    updated_at = now();

  return query
  select o.id, o.slug, o.name, 'owner'::public.organization_role
  from public.organizations o
  where o.slug = v_slug;
end;
$$;

create or replace function public.bootstrap_admin_owner(
  p_email text,
  p_organization_name text,
  p_organization_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_org_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'User % not found in auth.users', p_email;
  end if;

  insert into public.organizations (slug, name, created_by)
  values (lower(trim(p_organization_slug)), trim(p_organization_name), v_user_id)
  on conflict (slug)
  do update set
    name = excluded.name,
    updated_at = now()
  returning id into v_org_id;

  if v_org_id is null then
    select id into v_org_id
    from public.organizations
    where slug = lower(trim(p_organization_slug));
  end if;

  update public.organization_members
  set status = 'suspended', updated_at = now()
  where user_id = v_user_id
    and status = 'active'
    and organization_id <> v_org_id;

  update public.campaigns
  set organization_id = v_org_id
  where created_by = v_user_id
    and organization_id <> v_org_id;

  insert into public.organization_members (organization_id, user_id, email, role, status)
  select
    v_org_id,
    v_user_id,
    coalesce(nullif(u.email, ''), concat('unknown+', u.id::text, '@local.invalid')),
    'owner'::public.organization_role,
    'active'
  from auth.users u
  where u.id = v_user_id
  on conflict (organization_id, user_id)
  do update set
    role = 'owner'::public.organization_role,
    status = 'active',
    email = excluded.email,
    updated_at = now();

  return v_org_id;
end;
$$;

create or replace function public.create_organization_invite(
  p_organization_id uuid,
  p_email text,
  p_role public.organization_role default 'member',
  p_valid_hours int default 72
)
returns table (
  invite_id uuid,
  email text,
  role public.organization_role,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.organization_role;
  v_email text := lower(trim(p_email));
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz := now() + make_interval(hours => greatest(1, p_valid_hours));
  v_invite_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  select m.role into v_actor_role
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = v_actor
    and m.status = 'active'
  limit 1;

  if v_actor_role is null or v_actor_role not in ('owner', 'admin') then
    raise exception 'Only owner or admin can invite users.';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Invites can only assign admin or member role.';
  end if;

  if v_email = '' then
    raise exception 'Invite email is required.';
  end if;

  update public.organization_invites
  set status = 'revoked', updated_at = now()
  where organization_id = p_organization_id
    and lower(email::text) = v_email
    and status = 'pending';

  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.organization_invites (
    organization_id,
    email,
    role,
    token_hash,
    invited_by,
    status,
    expires_at
  ) values (
    p_organization_id,
    v_email,
    p_role,
    v_token_hash,
    v_actor,
    'pending',
    v_expires_at
  )
  returning id into v_invite_id;

  return query
  select v_invite_id, v_email, p_role, v_token, v_expires_at;
end;
$$;

create or replace function public.accept_organization_invite(p_token text)
returns table (
  organization_id uuid,
  organization_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_token_hash text;
  v_invite public.organization_invites%rowtype;
begin
  if v_actor is null then
    raise exception 'Authentication required.';
  end if;

  if coalesce(trim(p_token), '') = '' then
    raise exception 'Invite token is required.';
  end if;

  if exists (
    select 1
    from public.organization_members m
    where m.user_id = v_actor
      and m.status = 'active'
  ) then
    raise exception 'User already belongs to an organization.';
  end if;

  select coalesce(nullif(email, ''), concat('unknown+', id::text, '@local.invalid'))
  into v_actor_email
  from auth.users
  where id = v_actor;

  v_token_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  select *
  into v_invite
  from public.organization_invites i
  where i.token_hash = v_token_hash
    and i.status = 'pending'
  limit 1;

  if v_invite.id is null then
    raise exception 'Invite is invalid or already used.';
  end if;

  if v_invite.expires_at < now() then
    update public.organization_invites
    set status = 'expired', updated_at = now()
    where id = v_invite.id;
    raise exception 'Invite has expired.';
  end if;

  if lower(v_invite.email::text) <> lower(v_actor_email) then
    raise exception 'Invite email does not match the current account.';
  end if;

  insert into public.organization_members (organization_id, user_id, email, role, status)
  values (v_invite.organization_id, v_actor, v_actor_email, v_invite.role, 'active')
  on conflict (organization_id, user_id)
  do update set
    role = excluded.role,
    status = 'active',
    email = excluded.email,
    updated_at = now();

  update public.organization_invites
  set
    status = 'accepted',
    accepted_at = now(),
    accepted_by = v_actor,
    updated_at = now()
  where id = v_invite.id;

  return query
  select o.id, o.slug
  from public.organizations o
  where o.id = v_invite.organization_id;
end;
$$;

-- ----------
-- Grants for RPC (Supabase client)
-- ----------
grant execute on function public.get_my_primary_org() to authenticated;
grant execute on function public.ensure_user_organization() to authenticated;
grant execute on function public.create_organization_invite(uuid, text, public.organization_role, int) to authenticated;
grant execute on function public.accept_organization_invite(text) to authenticated;

-- ----------
-- RLS + Policies
-- ----------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
  on public.organizations
  for select
  using (public.is_org_member(id));

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin"
  on public.organizations
  for update
  using (public.is_org_member(id, array['owner', 'admin']::public.organization_role[]))
  with check (public.is_org_member(id, array['owner', 'admin']::public.organization_role[]));

drop policy if exists "organizations_insert_creator" on public.organizations;
create policy "organizations_insert_creator"
  on public.organizations
  for insert
  with check (auth.uid() = created_by);

drop policy if exists "organization_members_select_org_member" on public.organization_members;
create policy "organization_members_select_org_member"
  on public.organization_members
  for select
  using (public.is_org_member(organization_id));

drop policy if exists "organization_members_update_admin" on public.organization_members;
create policy "organization_members_update_admin"
  on public.organization_members
  for update
  using (public.is_org_member(organization_id, array['owner', 'admin']::public.organization_role[]))
  with check (public.is_org_member(organization_id, array['owner', 'admin']::public.organization_role[]));

drop policy if exists "organization_members_delete_admin" on public.organization_members;
create policy "organization_members_delete_admin"
  on public.organization_members
  for delete
  using (public.is_org_member(organization_id, array['owner', 'admin']::public.organization_role[]));

drop policy if exists "organization_invites_select_admin" on public.organization_invites;
create policy "organization_invites_select_admin"
  on public.organization_invites
  for select
  using (public.is_org_member(organization_id, array['owner', 'admin']::public.organization_role[]));

drop policy if exists "organization_invites_insert_admin" on public.organization_invites;
create policy "organization_invites_insert_admin"
  on public.organization_invites
  for insert
  with check (public.is_org_member(organization_id, array['owner', 'admin']::public.organization_role[]));

drop policy if exists "organization_invites_update_admin" on public.organization_invites;
create policy "organization_invites_update_admin"
  on public.organization_invites
  for update
  using (public.is_org_member(organization_id, array['owner', 'admin']::public.organization_role[]))
  with check (public.is_org_member(organization_id, array['owner', 'admin']::public.organization_role[]));

drop policy if exists "campaigns_select_org_member" on public.campaigns;
create policy "campaigns_select_org_member"
  on public.campaigns for select
  using (public.is_org_member(organization_id));

drop policy if exists "campaigns_insert_org_member" on public.campaigns;
create policy "campaigns_insert_org_member"
  on public.campaigns for insert
  with check (public.is_org_member(organization_id));

drop policy if exists "campaigns_update_org_member" on public.campaigns;
create policy "campaigns_update_org_member"
  on public.campaigns for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "campaigns_delete_org_member" on public.campaigns;
create policy "campaigns_delete_org_member"
  on public.campaigns for delete
  using (public.is_org_member(organization_id));

drop policy if exists "leads_select_org_member" on public.leads;
create policy "leads_select_org_member"
  on public.leads for select
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = leads.campaign_id
        and public.is_org_member(c.organization_id)
    )
  );

drop policy if exists "leads_insert_org_member" on public.leads;
create policy "leads_insert_org_member"
  on public.leads for insert
  with check (
    exists (
      select 1
      from public.campaigns c
      where c.id = leads.campaign_id
        and public.is_org_member(c.organization_id)
    )
  );

drop policy if exists "leads_update_org_member" on public.leads;
create policy "leads_update_org_member"
  on public.leads for update
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = leads.campaign_id
        and public.is_org_member(c.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.campaigns c
      where c.id = leads.campaign_id
        and public.is_org_member(c.organization_id)
    )
  );

drop policy if exists "leads_delete_org_member" on public.leads;
create policy "leads_delete_org_member"
  on public.leads for delete
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = leads.campaign_id
        and public.is_org_member(c.organization_id)
    )
  );
