drop policy if exists "Authenticated users can view courses" on public.courses;
drop policy if exists "Users see assigned published courses and staff see all" on public.courses;

create policy "Users see assigned published courses and staff see all"
on public.courses for select to authenticated
using (
  public.can_edit_courses()
  or (
    status = 'published'
    and exists (
      select 1
      from public.course_enrollments enrollment
      where enrollment.course_id = courses.id
        and enrollment.user_id = auth.uid()
    )
  )
);
