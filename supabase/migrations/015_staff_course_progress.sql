-- Staff can preview courses in the learner player, so their first progress row
-- must pass the same permission check already used for progress updates.
drop policy if exists "Group members create own lesson progress" on public.course_lesson_progress;
create policy "Group members create own lesson progress"
on public.course_lesson_progress for insert to authenticated
with check (
  public.can_edit_courses()
  or (user_id = auth.uid() and public.has_group_course_access(auth.uid(), course_id))
);
