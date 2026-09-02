-- Student access is derived exclusively from membership in a learning group
-- and a course assignment to that same group.
create or replace function public.has_group_course_access(target_user uuid, target_course uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.learning_group_members member
    join public.learning_group_courses assignment on assignment.group_id = member.group_id
    where member.user_id = target_user and assignment.course_id = target_course
  )
$$;

revoke all on function public.has_group_course_access(uuid, uuid) from public;
grant execute on function public.has_group_course_access(uuid, uuid) to authenticated;

drop policy if exists "Authenticated users can view courses" on public.courses;
drop policy if exists "Users see assigned published courses and staff see all" on public.courses;
create policy "Users see group-assigned published courses and staff see all"
on public.courses for select to authenticated
using (public.can_edit_courses() or (status = 'published' and public.has_group_course_access(auth.uid(), id)));

-- Enrollment rows are counters only; they no longer grant access.
drop policy if exists "Users enroll themselves" on public.course_enrollments;

drop policy if exists "Users create own lesson progress" on public.course_lesson_progress;
create policy "Group members create own lesson progress"
on public.course_lesson_progress for insert to authenticated
with check (public.can_edit_courses() or (user_id = auth.uid() and public.has_group_course_access(auth.uid(), course_id)));

drop policy if exists "Users update own lesson progress and staff update all" on public.course_lesson_progress;
create policy "Group members update own lesson progress and staff update all"
on public.course_lesson_progress for update to authenticated
using (public.can_edit_courses() or user_id = auth.uid())
with check (public.can_edit_courses() or (user_id = auth.uid() and public.has_group_course_access(auth.uid(), course_id)));

drop policy if exists "Enrolled students create own submissions" on public.course_assignment_submissions;
create policy "Group members create own submissions"
on public.course_assignment_submissions for insert to authenticated
with check (user_id = auth.uid() and public.has_group_course_access(auth.uid(), course_id));

drop policy if exists "Students update own submissions" on public.course_assignment_submissions;
create policy "Group members update own submissions"
on public.course_assignment_submissions for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and public.has_group_course_access(auth.uid(), course_id));

-- Remove historical self-enrollments and obsolete assignments.
delete from public.course_enrollments enrollment
where not public.has_group_course_access(enrollment.user_id, enrollment.course_id);
