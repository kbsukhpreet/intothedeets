-- Into the Deets — upgrade 6: private tickets
-- Run in Supabase → SQL Editor → New query → Run (after upgrade 5).
-- Safe to run more than once.
--
-- A private ticket (and its comments) can only be seen by the person who
-- created it and the person it's assigned to. Everyone else on the team
-- can't see it at all.

alter table public.tasks
  add column if not exists is_private boolean not null default false;

-- Can the logged-in person see this ticket?
create or replace function public.can_see_task(tid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = tid
      and public.is_event_member(t.event_id)
      and (not t.is_private or t.created_by = auth.uid() or t.assignee_id = auth.uid())
  );
$$;

-- Tickets
drop policy if exists "members manage tasks" on public.tasks;
drop policy if exists "members see tasks" on public.tasks;
drop policy if exists "members add tasks" on public.tasks;
drop policy if exists "members change tasks" on public.tasks;
drop policy if exists "members delete tasks" on public.tasks;

create policy "members see tasks" on public.tasks
  for select using (
    public.is_event_member(event_id)
    and (not is_private or created_by = auth.uid() or assignee_id = auth.uid())
  );
create policy "members add tasks" on public.tasks
  for insert with check (public.is_event_member(event_id));
create policy "members change tasks" on public.tasks
  for update using (
    public.is_event_member(event_id)
    and (not is_private or created_by = auth.uid() or assignee_id = auth.uid())
  ) with check (public.is_event_member(event_id));
create policy "members delete tasks" on public.tasks
  for delete using (
    public.is_event_member(event_id)
    and (not is_private or created_by = auth.uid() or assignee_id = auth.uid())
  );

-- Comments follow their ticket's privacy.
drop policy if exists "members read comments" on public.ticket_comments;
drop policy if exists "members add comments" on public.ticket_comments;

create policy "members read comments" on public.ticket_comments
  for select using (public.can_see_task(task_id));
create policy "members add comments" on public.ticket_comments
  for insert with check (public.can_see_task(task_id) and author_id = auth.uid());

revoke all on function public.can_see_task(uuid) from public, anon;
grant execute on function public.can_see_task(uuid) to authenticated;

notify pgrst, 'reload schema';
