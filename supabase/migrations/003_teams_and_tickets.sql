-- Into the Deets — upgrade 3: teams and tickets
-- Run this ONCE in Supabase → SQL Editor → New query → Run.
-- It keeps all your existing events, vendors, payments and tasks.
-- If anything goes wrong, nothing is changed (it all runs as one unit).

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
