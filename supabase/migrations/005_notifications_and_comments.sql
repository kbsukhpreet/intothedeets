-- Into the Deets — upgrade 5: email notification settings and comment editing
-- Run in Supabase → SQL Editor → New query → Run (after upgrade 4).
-- Safe to run more than once.

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
