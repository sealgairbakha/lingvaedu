create table if not exists public.learning_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text not null default '',
  mentor_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_group_members (
  group_id uuid not null references public.learning_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.learning_group_courses (
  group_id uuid not null references public.learning_groups(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (group_id, course_id)
);

create index if not exists learning_group_members_user_idx
  on public.learning_group_members(user_id);
create index if not exists learning_group_courses_course_idx
  on public.learning_group_courses(course_id);

alter table public.learning_groups enable row level security;
alter table public.learning_group_members enable row level security;
alter table public.learning_group_courses enable row level security;

drop policy if exists "Staff manage learning groups" on public.learning_groups;
create policy "Staff manage learning groups" on public.learning_groups
for all to authenticated using (public.can_edit_courses()) with check (public.can_edit_courses());

drop policy if exists "Members see learning groups" on public.learning_groups;
create policy "Members see learning groups" on public.learning_groups
for select to authenticated using (
  public.can_edit_courses() or exists (
    select 1 from public.learning_group_members gm
    where gm.group_id = id and gm.user_id = auth.uid()
  )
);

drop policy if exists "Staff manage group members" on public.learning_group_members;
create policy "Staff manage group members" on public.learning_group_members
for all to authenticated using (public.can_edit_courses()) with check (public.can_edit_courses());

drop policy if exists "Members see own memberships" on public.learning_group_members;
create policy "Members see own memberships" on public.learning_group_members
for select to authenticated using (user_id = auth.uid() or public.can_edit_courses());

drop policy if exists "Staff manage group courses" on public.learning_group_courses;
create policy "Staff manage group courses" on public.learning_group_courses
for all to authenticated using (public.can_edit_courses()) with check (public.can_edit_courses());

drop policy if exists "Members see assigned group courses" on public.learning_group_courses;
create policy "Members see assigned group courses" on public.learning_group_courses
for select to authenticated using (
  public.can_edit_courses() or exists (
    select 1 from public.learning_group_members gm
    where gm.group_id = group_id and gm.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.learning_groups to authenticated;
grant select, insert, update, delete on public.learning_group_members to authenticated;
grant select, insert, update, delete on public.learning_group_courses to authenticated;

-- The Vercel groups API uses service_role to read Auth users and synchronize
-- group course access. Explicit grants keep this migration portable between
-- projects with different default privilege settings.
grant usage on schema public to service_role;
grant select on public.courses to service_role;
grant select, insert, update, delete on public.course_enrollments to service_role;
grant select, insert, update, delete on public.learning_groups to service_role;
grant select, insert, update, delete on public.learning_group_members to service_role;
grant select, insert, update, delete on public.learning_group_courses to service_role;
