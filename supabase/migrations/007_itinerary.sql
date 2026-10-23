-- Into the Deets — upgrade 7: event itinerary
-- Run in Supabase → SQL Editor → New query → Run (after upgrade 6).
-- Safe to run more than once.

-- Each event can have several days (welcome dinner, ceremony day, brunch…).
create table if not exists public.itinerary_days (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  title      text not null,
  day_date   date,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

-- Each day has a timeline of items.
create table if not exists public.itinerary_items (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  day_id              uuid not null references public.itinerary_days(id) on delete cascade,
  start_time          time,
  end_time            time,
  title               text not null,
  location            text,
  notes               text,
  responsible_user_id uuid references auth.users(id) on delete set null,
  vendor_id           uuid references public.vendors(id) on delete set null,
  position            integer not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists itinerary_days_event_idx on public.itinerary_days (event_id, day_date);
create index if not exists itinerary_items_day_idx on public.itinerary_items (day_id, start_time);

-- A view-only link anyone can open (vendors, guests). Empty = sharing is off.
alter table public.events add column if not exists itinerary_share_token text unique;

alter table public.itinerary_days  enable row level security;
alter table public.itinerary_items enable row level security;

drop policy if exists "members manage itinerary days" on public.itinerary_days;
drop policy if exists "members manage itinerary items" on public.itinerary_items;

create policy "members manage itinerary days" on public.itinerary_days
  for all using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));
create policy "members manage itinerary items" on public.itinerary_items
  for all using (public.is_event_member(event_id))
  with check (public.is_event_member(event_id));

-- The shared, view-only itinerary. Works without logging in, but only with
-- the right link, and only while sharing is turned on.
create or replace function public.itinerary_public(p_token text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'event', jsonb_build_object(
      'name', e.name,
      'event_type', e.event_type,
      'event_date', e.event_date,
      'location', e.location,
      'team', t.name
    ),
    'days', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'title', d.title,
          'day_date', d.day_date,
          'items', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'start_time', i.start_time,
                'end_time', i.end_time,
                'title', i.title,
                'location', i.location,
                'notes', i.notes,
                'who', coalesce(split_part(p.full_name, ' ', 1), v.name)
              )
              order by i.start_time nulls last, i.position, i.created_at
            )
            from public.itinerary_items i
            left join public.profiles p on p.id = i.responsible_user_id
            left join public.vendors v on v.id = i.vendor_id
            where i.day_id = d.id
          ), '[]'::jsonb)
        )
        order by d.day_date nulls last, d.position, d.created_at
      )
      from public.itinerary_days d
      where d.event_id = e.id
    ), '[]'::jsonb)
  )
  from public.events e
  join public.teams t on t.id = e.team_id
  where p_token is not null and length(p_token) >= 16 and e.itinerary_share_token = p_token;
$$;

revoke all on function public.itinerary_public(text) from public;
grant execute on function public.itinerary_public(text) to anon, authenticated;

notify pgrst, 'reload schema';
