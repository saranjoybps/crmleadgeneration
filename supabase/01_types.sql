create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ----------
-- Types
-- ----------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('owner', 'admin', 'member', 'client');
  end if;
end $$;

do $$ begin
  alter type public.app_role add value if not exists 'client';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('active', 'on_hold', 'completed', 'archived');
  end if;
end $$;

do $$ begin
  alter type public.project_status add value if not exists 'active';
  alter type public.project_status add value if not exists 'on_hold';
  alter type public.project_status add value if not exists 'completed';
  alter type public.project_status add value if not exists 'archived';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'ticket_type') then
    create type public.ticket_type as enum ('feature', 'bug', 'improvement', 'recommendation', 'other');
  end if;
end $$;

do $$ begin
  alter type public.ticket_type add value if not exists 'feature';
  alter type public.ticket_type add value if not exists 'bug';
  alter type public.ticket_type add value if not exists 'improvement';
  alter type public.ticket_type add value if not exists 'recommendation';
  alter type public.ticket_type add value if not exists 'other';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type public.ticket_status as enum ('open', 'in_progress', 'review', 'hold', 'closed');
  end if;
end $$;

do $$ begin
  alter type public.ticket_status add value if not exists 'open';
  alter type public.ticket_status add value if not exists 'in_progress';
  alter type public.ticket_status add value if not exists 'review';
  alter type public.ticket_status add value if not exists 'hold';
  alter type public.ticket_status add value if not exists 'closed';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('open', 'in_progress', 'review', 'hold', 'closed');
  end if;
end $$;

do $$ begin
  alter type public.task_status add value if not exists 'open';
  alter type public.task_status add value if not exists 'in_progress';
  alter type public.task_status add value if not exists 'review';
  alter type public.task_status add value if not exists 'hold';
  alter type public.task_status add value if not exists 'closed';
exception
  when duplicate_object then null;
end $$;

