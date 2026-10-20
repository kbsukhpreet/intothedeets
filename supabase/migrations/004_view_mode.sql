-- Into the Deets — upgrade 4: personal or team view
-- Run this ONCE in Supabase → SQL Editor → New query → Run (after upgrade 3).
-- Safe to run again: it skips anything that's already there.

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
