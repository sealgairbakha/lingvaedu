-- Server-side group management reads courses and synchronizes enrollments.
-- These grants are safe because service_role is only used inside Vercel Functions
-- and must never be exposed through a VITE_* environment variable.

grant usage on schema public to service_role;

grant select on table public.courses to service_role;
grant select, insert, update, delete on table public.course_enrollments to service_role;

grant select, insert, update, delete on table public.learning_groups to service_role;
grant select, insert, update, delete on table public.learning_group_members to service_role;
grant select, insert, update, delete on table public.learning_group_courses to service_role;
