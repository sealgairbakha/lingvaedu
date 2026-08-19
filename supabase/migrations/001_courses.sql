create table if not exists public.courses (
  id uuid primary key,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  language text not null default 'Английский',
  author_id uuid references auth.users(id) on delete set null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create or replace function public.can_edit_courses()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'staff') $$;

drop policy if exists "Authenticated users can view courses" on public.courses;
create policy "Authenticated users can view courses" on public.courses for select to authenticated using (true);
drop policy if exists "Staff can create courses" on public.courses;
create policy "Staff can create courses" on public.courses for insert to authenticated with check (public.can_edit_courses());
drop policy if exists "Staff can update courses" on public.courses;
create policy "Staff can update courses" on public.courses for update to authenticated using (public.can_edit_courses()) with check (public.can_edit_courses());
drop policy if exists "Staff can delete courses" on public.courses;
create policy "Staff can delete courses" on public.courses for delete to authenticated using (public.can_edit_courses());

grant select on public.courses to authenticated;
grant insert, update, delete on public.courses to authenticated;
