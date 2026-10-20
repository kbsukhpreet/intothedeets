-- Into the Deets — database setup (version 2: events)
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
--
-- It is safe to run more than once. The first section removes the old
-- wedding-only tables from version 1 (there was only test data in them).
-- Your login accounts are NOT deleted.

-- ─────────────────────────────────────────────────────────────
-- Clean up version 1
-- ─────────────────────────────────────────────────────────────

drop function if exists public.create_wedding(text,text,date,text,numeric,text);
drop function if exists public.accept_invite(text,text);
drop function if exists public.invite_preview(text);
drop table if exists public.tasks cascade;
drop table if exists public.payments cascade;
drop table if exists public.vendor_notes cascade;
drop table if exists public.vendors cascade;
drop table if exists public.wedding_invites cascade;
drop table if exists public.wedding_members cascade;
drop table if exists public.weddings cascade;
drop function if exists public.is_wedding_member(uuid);

-- Clean up version 2 too, so this file can be re-run from scratch.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.create_event(text,text,date,text,numeric);
drop table if exists public.event_invites cascade;
drop table if exists public.event_members cascade;
drop table if exists public.events cascade;
drop table if exists public.profiles cascade;
drop function if exists public.is_event_member(uuid);

-- ─────────────────────────────────────────────────────────────
-- People
-- ─────────────────────────────────────────────────────────────

-- One row per account: the details from the sign-up form.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  purpose    text,
  created_at timestamptz not null default now()
);

-- Automatically create a profile whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, purpose)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'purpose'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Give accounts created before this file ran a profile too.
insert into public.profiles (id, full_name, email, purpose)
select id, raw_user_meta_data ->> 'full_name', email, raw_user_meta_data ->> 'purpose'
from auth.users
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Events
-- ─────────────────────────────────────────────────────────────

create table public.events (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  event_type   text not null default 'Other',
  event_date   date,
  location     text,
  total_budget numeric(12,2) not null default 0,
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table public.event_members (
  event_id     uuid not null references public.events(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'collaborator' check (role in ('owner','collaborator')),
  display_name text,
  email        text,
  joined_at    timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.event_invites (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  invited_by  uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create table public.vendors (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  category       text not null default 'Other',
  name           text not null,
  contact_name   text,
  email          text,
  phone          text,
  website        text,
  status         text not null default 'researching'
                   check (status in ('researching','contacted','booked','declined')),
  contract_total numeric(12,2) not null default 0,
  notes          text,
  created_at     timestamptz not null default now()
);

-- The conversation log: "Florist — Sept 28: discussed centerpieces..."
create table public.vendor_notes (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  vendor_id  uuid not null references public.vendors(id) on delete cascade,
  note_date  date not null default current_date,
  channel    text not null default 'other'
               check (channel in ('call','email','meeting','text','other')),
  summary    text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  vendor_id  uuid references public.vendors(id) on delete cascade,
  label      text not null,
  amount     numeric(12,2) not null check (amount >= 0),
  due_date   date,
  paid       boolean not null default false,
  paid_on    date,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  vendor_id  uuid references public.vendors(id) on delete set null,
  title      text not null,
  notes      text,
  due_date   date,
  done       boolean not null default false,
  done_at    timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.event_members (user_id);
create index on public.vendors (event_id);
create index on public.vendor_notes (vendor_id, note_date desc);
create index on public.payments (event_id, due_date);
create index on public.tasks (event_id, done, due_date);

-- ─────────────────────────────────────────────────────────────
-- Helper: is the logged-in user part of this event?
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_event_member(eid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.event_members
    where event_id = eid and user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Security rules (Row Level Security)
-- Each person can only ever see events they are a member of.
-- ─────────────────────────────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.events        enable row level security;
alter table public.event_members enable row level security;
alter table public.event_invites enable row level security;
alter table public.vendors       enable row level security;
alter table public.vendor_notes  enable row level security;
alter table public.payments      enable row level security;
alter table public.tasks         enable row level security;

create policy "read own profile"   on public.profiles for select using (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid());

create policy "members read event"   on public.events
  for select using (public.is_event_member(id));
create policy "members update event" on public.events
  for update using (public.is_event_member(id));
create policy "creator deletes event" on public.events
  for delete using (created_by = auth.uid());

create policy "members see each other" on public.event_members
  for select using (public.is_event_member(event_id));
create policy "update own member row"  on public.event_members
  for update using (user_id = auth.uid());

create policy "members manage invites" on public.event_invites
  for all using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id) and invited_by = auth.uid());

create policy "members manage vendors" on public.vendors
  for all using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

create policy "members manage notes" on public.vendor_notes
  for all using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

create policy "members manage payments" on public.payments
  for all using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

create policy "members manage tasks" on public.tasks
  for all using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

-- ─────────────────────────────────────────────────────────────
-- Actions that need to do two things at once
-- ─────────────────────────────────────────────────────────────

-- Create an event and add the creator as its owner.
create or replace function public.create_event(
  p_name         text,
  p_event_type   text,
  p_event_date   date,
  p_location     text,
  p_total_budget numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  insert into public.events (name, event_type, event_date, location, total_budget, created_by)
  values (p_name, coalesce(p_event_type, 'Other'), p_event_date, p_location, coalesce(p_total_budget, 0), auth.uid())
  returning id into new_id;

  insert into public.event_members (event_id, user_id, role, display_name, email)
  select new_id, auth.uid(), 'owner', p.full_name, p.email
  from public.profiles p where p.id = auth.uid();

  if not found then
    insert into public.event_members (event_id, user_id, role, email)
    values (new_id, auth.uid(), 'owner', (select email from auth.users where id = auth.uid()));
  end if;

  return new_id;
end;
$$;

-- Accept a collaborator invite link.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.event_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  select * into inv from public.event_invites where token = p_token;
  if not found then
    raise exception 'This invite link is not valid';
  end if;
  if inv.accepted_at is not null and inv.accepted_by <> auth.uid() then
    raise exception 'This invite link has already been used';
  end if;

  insert into public.event_members (event_id, user_id, role, display_name, email)
  select inv.event_id, auth.uid(), 'collaborator', p.full_name,
         coalesce(p.email, (select email from auth.users where id = auth.uid()))
  from (select auth.uid() as uid) me
  left join public.profiles p on p.id = me.uid
  on conflict (event_id, user_id) do nothing;

  update public.event_invites
     set accepted_by = auth.uid(), accepted_at = coalesce(accepted_at, now())
   where id = inv.id;

  return inv.event_id;
end;
$$;

-- Look up which event an invite is for (so the invite page can show its name).
create or replace function public.invite_preview(p_token text)
returns table (event_name text, event_type text, used boolean)
language sql
security definer
stable
set search_path = public
as $$
  select e.name, e.event_type, (i.accepted_at is not null)
  from public.event_invites i
  join public.events e on e.id = i.event_id
  where i.token = p_token;
$$;

revoke all on function public.create_event(text,text,date,text,numeric) from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
revoke all on function public.invite_preview(text) from public, anon;
grant execute on function public.create_event(text,text,date,text,numeric) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.invite_preview(text) to authenticated;
