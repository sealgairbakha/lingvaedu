insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-media',
  'course-media',
  true,
  524288000,
  array[
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public course media" on storage.objects;
create policy "Public course media" on storage.objects
for select using (bucket_id = 'course-media');

drop policy if exists "Staff can upload course media" on storage.objects;
create policy "Staff can upload course media" on storage.objects
for insert to authenticated
with check (bucket_id = 'course-media' and public.can_edit_courses());

drop policy if exists "Staff can update course media" on storage.objects;
create policy "Staff can update course media" on storage.objects
for update to authenticated
using (bucket_id = 'course-media' and public.can_edit_courses())
with check (bucket_id = 'course-media' and public.can_edit_courses());

drop policy if exists "Staff can delete course media" on storage.objects;
create policy "Staff can delete course media" on storage.objects
for delete to authenticated
using (bucket_id = 'course-media' and public.can_edit_courses());
