-- Into the Deets — database setup
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- It is safe to run on a fresh project. It creates the tables, and the security
-- rules that make sure each couple can only ever see their own wedding.

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.weddings (
  id            uuid primary key default gen_random_uuid(),
  partner1_name text not null,
  partner2_name text not null,
  wedding_date  date,
  location      text,
  total_budget  numeric(12,2) not null default 0,
  created_by    uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create table public.wedding_members (
  wedding_id   uuid not null references public.weddings(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'partner' check (role in ('owner','partner','planner')),
  display_name text,
  email        text,
  joined_at    timestamptz not null default now(),
  primary key (wedding_id, user_id)
);

create table public.wedding_invites (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  email       text,
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  invited_by  uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create table public.vendors (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     uuid not null references public.weddings(id) on delete cascade,
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
  wedding_id uuid not null references public.weddings(id) on delete cascade,
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
  wedding_id uuid not null references public.weddings(id) on delete cascade,
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
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  vendor_id  uuid references public.vendors(id) on delete set null,
  title      text not null,
  notes      text,
  due_date   date,
  done       boolean not null default false,
  done_at    timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.wedding_members (user_id);
create index on public.vendors (wedding_id);
create index on public.vendor_notes (vendor_id, note_date desc);
create index on public.payments (wedding_id, due_date);
create index on public.tasks (wedding_id, done, due_date);

-- ─────────────────────────────────────────────────────────────
-- Helper: is the logged-in user part of this wedding?
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_wedding_member(wid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.wedding_members
    where wedding_id = wid and user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Security rules (Row Level Security)
-- ─────────────────────────────────────────────────────────────

alter table public.weddings        enable row level security;
alter table public.wedding_members enable row level security;
alter table public.wedding_invites enable row level security;
alter table public.vendors         enable row level security;
alter table public.vendor_notes    enable row level security;
alter table public.payments        enable row level security;
alter table public.tasks           enable row level security;

create policy "members read wedding"   on public.weddings
  for select using (public.is_wedding_member(id));
create policy "members update wedding" on public.weddings
  for update using (public.is_wedding_member(id));

create policy "members see each other" on public.wedding_members
  for select using (public.is_wedding_member(wedding_id));
create policy "update own member row"  on public.wedding_members
  for update using (user_id = auth.uid());

create policy "members manage invites" on public.wedding_invites
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id) and invited_by = auth.uid());

create policy "members manage vendors" on public.vendors
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

create policy "members manage notes" on public.vendor_notes
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

create policy "members manage payments" on public.payments
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

create policy "members manage tasks" on public.tasks
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

-- ─────────────────────────────────────────────────────────────
-- Actions that need to do two things at once
-- ─────────────────────────────────────────────────────────────

-- Create a wedding and add the creator as its owner.
create or replace function public.create_wedding(
  p_partner1_name text,
  p_partner2_name text,
  p_wedding_date  date,
  p_location      text,
  p_total_budget  numeric,
  p_display_name  text
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

  insert into public.weddings (partner1_name, partner2_name, wedding_date, location, total_budget, created_by)
  values (p_partner1_name, p_partner2_name, p_wedding_date, p_location, coalesce(p_total_budget, 0), auth.uid())
  returning id into new_id;

  insert into public.wedding_members (wedding_id, user_id, role, display_name, email)
  values (new_id, auth.uid(), 'owner', p_display_name, (select email from auth.users where id = auth.uid()));

  return new_id;
end;
$$;

-- Accept a partner/planner invite link.
create or replace function public.accept_invite(p_token text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.wedding_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  select * into inv from public.wedding_invites where token = p_token;
  if not found then
    raise exception 'This invite link is not valid';
  end if;
  if inv.accepted_at is not null and inv.accepted_by <> auth.uid() then
    raise exception 'This invite link has already been used';
  end if;

  insert into public.wedding_members (wedding_id, user_id, role, display_name, email)
  values (inv.wedding_id, auth.uid(), 'partner', p_display_name, (select email from auth.users where id = auth.uid()))
  on conflict (wedding_id, user_id) do nothing;

  update public.wedding_invites
     set accepted_by = auth.uid(), accepted_at = coalesce(accepted_at, now())
   where id = inv.id;

  return inv.wedding_id;
end;
$$;

-- Look up which wedding an invite is for (so the invite page can show names)
create or replace function public.invite_preview(p_token text)
returns table (partner1_name text, partner2_name text, used boolean)
language sql
security definer
stable
set search_path = public
as $$
  select w.partner1_name, w.partner2_name, (i.accepted_at is not null)
  from public.wedding_invites i
  join public.weddings w on w.id = i.wedding_id
  where i.token = p_token;
$$;

revoke all on function public.create_wedding(text,text,date,text,numeric,text) from public, anon;
revoke all on function public.accept_invite(text,text) from public, anon;
revoke all on function public.invite_preview(text) from public, anon;
grant execute on function public.create_wedding(text,text,date,text,numeric,text) to authenticated;
grant execute on function public.accept_invite(text,text) to authenticated;
grant execute on function public.invite_preview(text) to authenticated;
