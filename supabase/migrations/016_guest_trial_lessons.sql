-- A published course exposes only its first lesson to guests. Never grant
-- anonymous SELECT on courses: its content column contains every lesson.
create or replace function public.guest_trial_catalog()
returns table (
  course_id uuid,
  course_title text,
  course_description text,
  course_language text,
  course_level text,
  course_cover_image text,
  lesson_id text,
  lesson_title text
)
language sql stable security definer set search_path = ''
as $$
  select
    course.id,
    course.title,
    coalesce(course.content ->> 'description', ''),
    course.language,
    course.content ->> 'level',
    course.content ->> 'coverImage',
    first_lesson.lesson ->> 'id',
    first_lesson.lesson ->> 'title'
  from public.courses as course
  cross join lateral (
    select lesson.value as lesson
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
  where course.status = 'published'
  order by course.updated_at desc;
$$;

create or replace function public.guest_trial_lesson(target_course_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'courseId', course.id,
    'courseTitle', course.title,
    'courseLanguage', course.language,
    'lesson', first_lesson.lesson
  )
  from public.courses as course
  cross join lateral (
    select lesson.value as lesson
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

revoke all on function public.guest_trial_catalog() from public;
revoke all on function public.guest_trial_lesson(uuid) from public;
grant execute on function public.guest_trial_catalog() to anon, authenticated;
grant execute on function public.guest_trial_lesson(uuid) to anon, authenticated;
