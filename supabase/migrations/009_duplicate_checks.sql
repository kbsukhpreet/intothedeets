-- Into the Deets — upgrade 9: duplicate expense checks
-- Run in Supabase → SQL Editor → New query → Run (after upgrade 8).
-- Safe to run more than once.

-- Entries someone has confirmed are NOT duplicates, so they stop being flagged.
alter table public.expenses add column if not exists duplicate_ok boolean not null default false;
alter table public.payments add column if not exists duplicate_ok boolean not null default false;

notify pgrst, 'reload schema';
