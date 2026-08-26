create table if not exists public.course_lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null,
  status text not null default 'in_progress' check (status in ('not_started', 'in_progress', 'completed')),
  progress smallint not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  last_opened_at timestamptz not null default now(),
  primary key (user_id, course_id, lesson_id)
);

create index if not exists course_lesson_progress_user_recent_idx
  on public.course_lesson_progress (user_id, last_opened_at desc);

alter table public.course_lesson_progress enable row level security;

drop policy if exists "Users see own lesson progress and staff see all" on public.course_lesson_progress;
create policy "Users see own lesson progress and staff see all"
on public.course_lesson_progress for select to authenticated
using (user_id = auth.uid() or public.can_edit_courses());

drop policy if exists "Users create own lesson progress" on public.course_lesson_progress;
create policy "Users create own lesson progress"
on public.course_lesson_progress for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own lesson progress and staff update all" on public.course_lesson_progress;
create policy "Users update own lesson progress and staff update all"
on public.course_lesson_progress for update to authenticated
using (user_id = auth.uid() or public.can_edit_courses())
with check (user_id = auth.uid() or public.can_edit_courses());

grant select, insert, update on public.course_lesson_progress to authenticated;
