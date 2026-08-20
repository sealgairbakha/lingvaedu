create table if not exists public.course_enrollments (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (course_id, user_id)
);

alter table public.course_enrollments enable row level security;

drop policy if exists "Users see own enrollments and staff see all" on public.course_enrollments;
create policy "Users see own enrollments and staff see all" on public.course_enrollments
for select to authenticated
using (user_id = auth.uid() or public.can_edit_courses());

drop policy if exists "Users enroll themselves" on public.course_enrollments;
create policy "Users enroll themselves" on public.course_enrollments
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Staff manage enrollments" on public.course_enrollments;
create policy "Staff manage enrollments" on public.course_enrollments
for all to authenticated
using (public.can_edit_courses())
with check (public.can_edit_courses());

grant select, insert, update, delete on public.course_enrollments to authenticated;
