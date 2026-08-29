create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_username_format check (username ~ '^[a-z0-9._-]{3,32}$')
);

create unique index if not exists user_profiles_username_unique on public.user_profiles (lower(username));

with normalized as (
  select id, created_at,
    coalesce(
      nullif(regexp_replace(lower(raw_user_meta_data ->> 'username'), '[^a-z0-9._-]', '', 'g'), ''),
      nullif(regexp_replace(split_part(lower(email), '@', 1), '[^a-z0-9._-]', '', 'g'), ''),
      'user'
    ) as base
  from auth.users
), numbered as (
  select *, row_number() over (partition by base order by created_at, id) as occurrence
  from normalized
)
insert into public.user_profiles (user_id, username)
select id,
  case when length(base) >= 3 then left(base, 23) else 'user-' || left(replace(id::text, '-', ''), 8) end
  || case when occurrence = 1 then '' else '-' || left(replace(id::text, '-', ''), 8) end
from numbered on conflict (user_id) do nothing;

create or replace function public.sync_user_profile_username()
returns trigger language plpgsql security definer set search_path = public
as $$
declare requested text;
begin
  requested := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if requested = '' then
    requested := left(coalesce(nullif(split_part(lower(new.email), '@', 1), ''), 'user-' || left(replace(new.id::text, '-', ''), 8)), 32);
  end if;
  insert into public.user_profiles (user_id, username, updated_at) values (new.id, requested, now())
  on conflict (user_id) do update set username = excluded.username, updated_at = now();
  return new;
exception when unique_violation then raise exception 'Имя пользователя уже занято';
end;
$$;

drop trigger if exists sync_user_profile_username on auth.users;
create trigger sync_user_profile_username after insert or update of raw_user_meta_data on auth.users
for each row execute function public.sync_user_profile_username();

alter table public.user_profiles enable row level security;
drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile" on public.user_profiles for select to authenticated using (user_id = auth.uid());
grant select on public.user_profiles to authenticated;
