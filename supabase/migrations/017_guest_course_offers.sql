-- Student offers live in courses.content, so saving course details and prices stays atomic.
-- Anonymous visitors still cannot SELECT courses: content includes every lesson.
create or replace function public.valid_student_offers(offers jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select case
    when offers is null then true
    when pg_catalog.jsonb_typeof(offers) <> 'object' then false
    else
      case when offers ? 'selfPacedPriceKzt' then
        case when pg_catalog.jsonb_typeof(offers -> 'selfPacedPriceKzt') = 'number'
          and (offers ->> 'selfPacedPriceKzt') ~ '^[0-9]+$'
          then (offers ->> 'selfPacedPriceKzt')::numeric >= 30000
          else false end
      else true end
      and case when offers ? 'withTeacherPriceKzt' then
        case when pg_catalog.jsonb_typeof(offers -> 'withTeacherPriceKzt') = 'number'
          and (offers ->> 'withTeacherPriceKzt') ~ '^[0-9]+$'
          then (offers ->> 'withTeacherPriceKzt')::numeric >= 50000
          else false end
      else true end
  end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'courses_valid_student_offers'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_valid_student_offers
      check (public.valid_student_offers(content -> 'offers'));
  end if;
end;
$$;

create or replace function public.guest_course_catalog()
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
  with_teacher_price_kzt numeric
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
    first_lesson.lesson ->> 'title',
    (course.content #>> '{offers,selfPacedPriceKzt}')::numeric,
    (course.content #>> '{offers,withTeacherPriceKzt}')::numeric
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

revoke all on function public.guest_course_catalog() from public;
grant execute on function public.guest_course_catalog() to anon, authenticated;
