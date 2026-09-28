-- Expose only the published course's cover settings to the guest catalog.
-- Full course content and later lessons remain private.
create or replace function public.guest_course_catalog_visuals()
returns table (
  course_id uuid,
  course_title text,
  course_description text,
  course_language text,
  course_level text,
  course_cover_image text,
  lesson_id text,
  lesson_title text,
  self_paced_price_kzt numeric,
  with_teacher_price_kzt numeric,
  course_code text,
  course_color text,
  course_cover_style text,
  course_show_new_ribbon boolean
)
language sql stable security definer set search_path = ''
as $$
  select
    catalog.course_id,
    catalog.course_title,
    catalog.course_description,
    catalog.course_language,
    catalog.course_level,
    catalog.course_cover_image,
    catalog.lesson_id,
    catalog.lesson_title,
    catalog.self_paced_price_kzt,
    catalog.with_teacher_price_kzt,
    course.content ->> 'code',
    course.content ->> 'color',
    course.content ->> 'coverStyle',
    case when pg_catalog.jsonb_typeof(course.content -> 'showNewRibbon') = 'boolean'
      then (course.content ->> 'showNewRibbon')::boolean
      else null end
  from public.guest_course_catalog() as catalog
  join public.courses as course on course.id = catalog.course_id
  where course.status = 'published';
$$;

revoke all on function public.guest_course_catalog_visuals() from public;
grant execute on function public.guest_course_catalog_visuals() to anon, authenticated;
