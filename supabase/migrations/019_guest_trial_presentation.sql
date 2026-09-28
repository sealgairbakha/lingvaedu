-- Keep the guest's first lesson in the same presentation context as the course player.
-- The function still returns only the first lesson of a published course.
create or replace function public.guest_trial_lesson(target_course_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'courseId', course.id,
    'courseTitle', course.title,
    'courseLanguage', course.language,
    'lessonPattern', course.content ->> 'lessonPattern',
    'moduleTitle', first_lesson.module_title,
    'lessonCount', first_lesson.lesson_count,
    'lesson', first_lesson.lesson
  )
  from public.courses as course
  cross join lateral (
    select
      module.value ->> 'title' as module_title,
      lesson.value as lesson,
      pg_catalog.count(*) over () as lesson_count
    from pg_catalog.jsonb_array_elements(
      case when pg_catalog.jsonb_typeof(course.content -> 'modules') = 'array'
        then course.content -> 'modules' else '[]'::jsonb end
    ) with ordinality as module(value, module_order)
    cross join lateral pg_catalog.jsonb_array_elements(
      case when pg_catalog.jsonb_typeof(module.value -> 'lessons') = 'array'
        then module.value -> 'lessons' else '[]'::jsonb end
    ) with ordinality as lesson(value, lesson_order)
    order by module.module_order, lesson.lesson_order
    limit 1
  ) as first_lesson
  where course.id = target_course_id and course.status = 'published';
$$;

revoke all on function public.guest_trial_lesson(uuid) from public;
grant execute on function public.guest_trial_lesson(uuid) to anon, authenticated;
