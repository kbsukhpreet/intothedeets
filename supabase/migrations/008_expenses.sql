-- Into the Deets — upgrade 8: expenses
-- Run in Supabase → SQL Editor → New query → Run (after upgrade 7).
-- Safe to run more than once.

-- Everything spent that isn't a scheduled vendor payment
-- (decor orders, outfits, gifts, travel, tips…).
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  spent_on        date not null default current_date,
  description     text not null,
  category        text not null default 'Other',
  amount          numeric(12,2) not null check (amount >= 0),
  paid_by_user_id uuid references auth.users(id) on delete set null,
  paid_by_name    text,
  method          text,
  vendor_id       uuid references public.vendors(id) on delete set null,
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists expenses_event_idx on public.expenses (event_id, spent_on desc);

-- Vendor payments that are marked paid also show in the expenses list,
-- so they get the same "who paid" and "how" details.
alter table public.payments
  add column if not exists paid_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists paid_by_name text,
  add column if not exists method text;

alter table public.expenses enable row level security;
drop policy if exists "members manage expenses" on public.expenses;
create policy "members manage expenses" on public.expenses
  for all using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

notify pgrst, 'reload schema';
