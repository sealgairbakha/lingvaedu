create table if not exists public.course_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null default 'Ученик',
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null,
  block_id uuid not null,
  body text not null default '',
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint check (attachment_size is null or attachment_size >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, block_id),
  check (length(body) <= 50000),
  check (body <> '' or attachment_path is not null)
);

create index if not exists course_assignment_submissions_review_idx
  on public.course_assignment_submissions (course_id, block_id, updated_at desc);

alter table public.course_assignment_submissions enable row level security;

drop policy if exists "Students see own submissions and staff see all" on public.course_assignment_submissions;
create policy "Students see own submissions and staff see all"
on public.course_assignment_submissions for select to authenticated
using (user_id = auth.uid() or public.can_edit_courses());

drop policy if exists "Enrolled students create own submissions" on public.course_assignment_submissions;
create policy "Enrolled students create own submissions"
on public.course_assignment_submissions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.course_enrollments enrollment
    where enrollment.course_id = course_assignment_submissions.course_id
      and enrollment.user_id = auth.uid()
  )
);

drop policy if exists "Students update own submissions" on public.course_assignment_submissions;
create policy "Students update own submissions"
on public.course_assignment_submissions for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.course_assignment_replies (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.course_assignment_submissions(id) on delete cascade,
  staff_id uuid not null references auth.users(id) on delete cascade,
  staff_name text not null default 'Преподаватель',
  body text not null check (body <> '' and length(body) <= 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_assignment_replies enable row level security;

drop policy if exists "Students see replies to own submissions and staff see all" on public.course_assignment_replies;
create policy "Students see replies to own submissions and staff see all"
on public.course_assignment_replies for select to authenticated
using (
  public.can_edit_courses()
  or exists (
    select 1 from public.course_assignment_submissions submission
    where submission.id = course_assignment_replies.submission_id
      and submission.user_id = auth.uid()
  )
);

drop policy if exists "Staff create assignment replies" on public.course_assignment_replies;
create policy "Staff create assignment replies"
on public.course_assignment_replies for insert to authenticated
with check (public.can_edit_courses() and staff_id = auth.uid());

drop policy if exists "Staff update assignment replies" on public.course_assignment_replies;
create policy "Staff update assignment replies"
on public.course_assignment_replies for update to authenticated
using (public.can_edit_courses())
with check (public.can_edit_courses() and staff_id = auth.uid());

grant select, insert, update on public.course_assignment_submissions to authenticated;
grant select, insert, update on public.course_assignment_replies to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-submissions',
  'course-submissions',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own course submissions" on storage.objects;
create policy "Users upload own course submissions"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'course-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users and staff read course submissions" on storage.objects;
create policy "Users and staff read course submissions"
on storage.objects for select to authenticated
using (
  bucket_id = 'course-submissions'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.can_edit_courses())
);

drop policy if exists "Users update own course submissions" on storage.objects;
create policy "Users update own course submissions"
on storage.objects for update to authenticated
using (
  bucket_id = 'course-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'course-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
);

