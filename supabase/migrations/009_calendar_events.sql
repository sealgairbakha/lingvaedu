create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz not null,
  color text not null default 'violet' check (color in ('violet', 'blue', 'green', 'orange', 'pink')),
  audience text not null default 'all' check (audience in ('all', 'students', 'staff')),
  course_id uuid references public.courses(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists calendar_events_start_idx on public.calendar_events(start_at);
create index if not exists calendar_events_course_idx on public.calendar_events(course_id);

alter table public.calendar_events enable row level security;

drop policy if exists "Authenticated users see calendar events" on public.calendar_events;
create policy "Authenticated users see calendar events" on public.calendar_events
for select to authenticated using (true);

drop policy if exists "Staff manage calendar events" on public.calendar_events;
create policy "Staff manage calendar events" on public.calendar_events
for all to authenticated using (public.can_edit_courses()) with check (public.can_edit_courses());

grant select on public.calendar_events to authenticated;
grant insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.calendar_events to service_role;
