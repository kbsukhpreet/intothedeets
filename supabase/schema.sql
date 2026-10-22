-- Into the Deets — FULL database setup for a brand-new Supabase project.
-- ⚠️  This file DELETES all existing app data and rebuilds the tables.
--     To upgrade an existing project without losing data, run the files in
--     supabase/migrations/ instead.
-- Paste into Supabase → SQL Editor → New query → Run.

-- Clean up version 3
drop table if exists public.ticket_comments cascade;
drop table if exists public.team_members cascade;
drop table if exists public.teams cascade;
drop function if exists public.create_team(text);
drop function if exists public.create_event(uuid,text,text,date,text,numeric);
drop function if exists public.join_team(text);
drop function if exists public.team_invite_preview(text);
drop function if exists public.reset_team_invite(uuid);
drop function if exists public.ticket_before_write() cascade;
drop function if exists public.shares_team_with(uuid) cascade;
drop function if exists public.is_team_owner(uuid) cascade;
drop function if exists public.is_team_member(uuid) cascade;

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
drop function if exists public.is_event_member(uuid) cascade;

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


-- ═════════════════════════════════════════════════════════════
-- Version 3: teams and tickets
-- ═════════════════════════════════════════════════════════════

-- Stop if this upgrade has already been run.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'team_id'
  ) then
    raise exception 'This upgrade has already been applied. Nothing was changed.';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Teams
-- ─────────────────────────────────────────────────────────────

create table public.teams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  ticket_seq   integer not null default 0,
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table public.team_members (
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index on public.team_members (user_id);

alter table public.events add column team_id uuid references public.teams(id) on delete cascade;

-- Move existing data: one team per person who created events,
-- containing everyone who was a collaborator on those events.
insert into public.teams (name, created_by)
select coalesce(nullif(split_part(p.full_name, ' ', 1), '') || '''s team', 'My team'), c.created_by
from (select distinct created_by from public.events) c
left join public.profiles p on p.id = c.created_by;

update public.events e set team_id = t.id
from public.teams t where t.created_by = e.created_by;

insert into public.team_members (team_id, user_id, role)
select id, created_by, 'owner' from public.teams;

insert into public.team_members (team_id, user_id, role)
select distinct e.team_id, m.user_id, 'member'
from public.event_members m
join public.events e on e.id = m.event_id
on conflict (team_id, user_id) do nothing;

alter table public.events alter column team_id set not null;
create index on public.events (team_id);

-- Per-event membership is replaced by team membership.
drop function if exists public.accept_invite(text);
drop function if exists public.invite_preview(text);
drop function if exists public.create_event(text,text,date,text,numeric);
drop table public.event_invites;
drop table public.event_members;

-- ─────────────────────────────────────────────────────────────
-- Tasks become tickets
-- ─────────────────────────────────────────────────────────────

alter table public.tasks
  add column number      integer,
  add column status      text not null default 'todo'
                           check (status in ('todo','in_progress','blocked','done')),
  add column priority    text not null default 'medium'
                           check (priority in ('low','medium','high','urgent')),
  add column assignee_id uuid references auth.users(id) on delete set null,
  add column updated_at  timestamptz not null default now();

update public.tasks set status = 'done', done_at = coalesce(done_at, now()) where done;
alter table public.tasks drop column done;

-- Number existing tickets 1, 2, 3… within each team.
with numbered as (
  select t.id, row_number() over (partition by e.team_id order by t.created_at) as n
  from public.tasks t join public.events e on e.id = t.event_id
)
update public.tasks t set number = numbered.n from numbered where numbered.id = t.id;

update public.teams tm set ticket_seq = coalesce((
  select max(t.number) from public.tasks t join public.events e on e.id = t.event_id
  where e.team_id = tm.id
), 0);

create index on public.tasks (assignee_id);
create index on public.tasks (event_id, status);

-- Progress updates / comments on a ticket.
create table public.ticket_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  event_id   uuid not null references public.events(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index on public.ticket_comments (task_id, created_at);

-- Give each new ticket the next number for its team, and keep timestamps right.
create or replace function public.ticket_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.teams set ticket_seq = ticket_seq + 1
    where id = (select team_id from public.events where id = new.event_id)
    returning ticket_seq into new.number;
  end if;

  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.done_at := now();
  elsif new.status <> 'done' then
    new.done_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger ticket_before_write
  before insert or update on public.tasks
  for each row execute function public.ticket_before_write();

-- ─────────────────────────────────────────────────────────────
-- Who can see what
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_team_member(tid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members where team_id = tid and user_id = auth.uid()
  );
$$;

-- Being on an event now means being on the event's team.
-- Every existing rule for vendors, notes, payments and tickets uses this.
create or replace function public.is_event_member(eid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    join public.team_members tm on tm.team_id = e.team_id
    where e.id = eid and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_owner(tid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members where team_id = tid and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.shares_team_with(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members a
    join public.team_members b on b.team_id = a.team_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

alter table public.teams           enable row level security;
alter table public.team_members    enable row level security;
alter table public.ticket_comments enable row level security;

create policy "members read team"   on public.teams for select using (public.is_team_member(id));
create policy "owners update team"  on public.teams for update using (public.is_team_owner(id));
create policy "owners delete team"  on public.teams for delete using (created_by = auth.uid());

create policy "members see team"    on public.team_members for select using (public.is_team_member(team_id));
create policy "leave or remove"     on public.team_members for delete using (
  user_id = auth.uid() or public.is_team_owner(team_id)
);

create policy "teammates read profiles" on public.profiles for select using (public.shares_team_with(id));

create policy "members manage comments" on public.ticket_comments
  for all using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id) and author_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Actions
-- ─────────────────────────────────────────────────────────────

create or replace function public.create_team(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  insert into public.teams (name, created_by) values (p_name, auth.uid()) returning id into new_id;
  insert into public.team_members (team_id, user_id, role) values (new_id, auth.uid(), 'owner');
  return new_id;
end;
$$;

create or replace function public.create_event(
  p_team_id      uuid,
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
  if not public.is_team_member(p_team_id) then
    raise exception 'You are not on that team';
  end if;
  insert into public.events (team_id, name, event_type, event_date, location, total_budget, created_by)
  values (p_team_id, p_name, coalesce(p_event_type, 'Other'), p_event_date, p_location, coalesce(p_total_budget, 0), auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.join_team(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  select id into tid from public.teams where invite_token = p_token;
  if tid is null then raise exception 'This invite link is not valid anymore. Ask for a new one.'; end if;
  insert into public.team_members (team_id, user_id, role) values (tid, auth.uid(), 'member')
  on conflict (team_id, user_id) do nothing;
  return tid;
end;
$$;

create or replace function public.team_invite_preview(p_token text)
returns table (team_name text, inviter_name text, member_count bigint, already_member boolean)
language sql
security definer
stable
set search_path = public
as $$
  select t.name,
         p.full_name,
         (select count(*) from public.team_members m where m.team_id = t.id),
         exists (select 1 from public.team_members m where m.team_id = t.id and m.user_id = auth.uid())
  from public.teams t
  left join public.profiles p on p.id = t.created_by
  where t.invite_token = p_token;
$$;

create or replace function public.reset_team_invite(p_team_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  tok text;
begin
  if not public.is_team_owner(p_team_id) then
    raise exception 'Only the team owner can reset the invite link';
  end if;
  update public.teams set invite_token = replace(gen_random_uuid()::text, '-', '')
  where id = p_team_id returning invite_token into tok;
  return tok;
end;
$$;

revoke all on function public.create_team(text) from public, anon;
revoke all on function public.create_event(uuid,text,text,date,text,numeric) from public, anon;
revoke all on function public.join_team(text) from public, anon;
revoke all on function public.team_invite_preview(text) from public, anon;
revoke all on function public.reset_team_invite(uuid) from public, anon;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.create_event(uuid,text,text,date,text,numeric) to authenticated;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.team_invite_preview(text) to authenticated;
grant execute on function public.reset_team_invite(uuid) to authenticated;


-- ═════════════════════════════════════════════════════════════
-- Version 4: personal or team view
-- ═════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists view_mode text not null default 'team'
  check (view_mode in ('personal', 'team'));

-- Accounts that chose a view at sign-up keep that choice.
update public.profiles p
set view_mode = u.raw_user_meta_data ->> 'view_mode'
from auth.users u
where u.id = p.id and u.raw_user_meta_data ->> 'view_mode' in ('personal', 'team');

-- Save the choice from the sign-up form on every new account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, purpose, view_mode)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'purpose',
    case when new.raw_user_meta_data ->> 'view_mode' = 'personal' then 'personal' else 'team' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


-- ═════════════════════════════════════════════════════════════
-- Version 5: notification settings and comment editing
-- ═════════════════════════════════════════════════════════════

-- Each person chooses which emails they get. Both are on by default.
alter table public.profiles
  add column if not exists notify_assigned boolean not null default true,
  add column if not exists notify_comments boolean not null default true;

-- Comments can be edited by the person who wrote them.
alter table public.ticket_comments
  add column if not exists edited_at timestamptz;

-- Anyone on the team can read and add comments,
-- but only the author can edit or delete their own.
drop policy if exists "members manage comments" on public.ticket_comments;
drop policy if exists "members read comments" on public.ticket_comments;
drop policy if exists "members add comments" on public.ticket_comments;
drop policy if exists "authors edit comments" on public.ticket_comments;
drop policy if exists "authors delete comments" on public.ticket_comments;

create policy "members read comments" on public.ticket_comments
  for select using (public.is_event_member(event_id));
create policy "members add comments" on public.ticket_comments
  for insert with check (public.is_event_member(event_id) and author_id = auth.uid());
create policy "authors edit comments" on public.ticket_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors delete comments" on public.ticket_comments
  for delete using (author_id = auth.uid());

notify pgrst, 'reload schema';
