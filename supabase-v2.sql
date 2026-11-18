-- Таблиці для v2 (рейтинг починається з нуля). Виконати в Supabase → SQL Editor.
create table if not exists public.v2_study_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.v2_group_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  learned_count int not null default 0,
  hard_count int not null default 0,
  streak int not null default 0,
  xp int not null default 0,
  updated_at timestamptz not null default now()
);

-- Профіль у рейтингу: аватарка і девіз (виконати, якщо таблиці вже створені раніше)
alter table public.v2_group_profiles add column if not exists motto text not null default '';
alter table public.v2_group_profiles add column if not exists avatar text not null default '';
alter table public.v2_group_profiles add column if not exists avatar_photo text not null default '';
alter table public.v2_group_profiles add column if not exists card_style text not null default 'frost';
alter table public.v2_group_profiles add column if not exists public_stats jsonb not null default '{}'::jsonb;

-- Права для залогінених користувачів (у нових проєктах Supabase їх треба видавати явно)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.v2_study_progress to authenticated;
grant select, insert, update on public.v2_group_profiles to authenticated;

alter table public.v2_study_progress enable row level security;
alter table public.v2_group_profiles enable row level security;

drop policy if exists "own progress" on public.v2_study_progress;
create policy "own progress" on public.v2_study_progress
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "read ranking" on public.v2_group_profiles;
create policy "read ranking" on public.v2_group_profiles
  for select to authenticated using (true);
drop policy if exists "write own profile" on public.v2_group_profiles;
create policy "write own profile" on public.v2_group_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "update own profile" on public.v2_group_profiles;
create policy "update own profile" on public.v2_group_profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);


-- ===== Пропозиції від учасників (кнопка «Запропонувати щось для сайту») =====
create table if not exists public.v2_suggestions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  kind text not null default 'idea' check (kind in ('idea', 'bug', 'other')),
  text text not null check (char_length(text) between 3 and 600),
  created_at timestamptz not null default now()
);
alter table public.v2_suggestions enable row level security;
drop policy if exists "suggestions insert own" on public.v2_suggestions;
create policy "suggestions insert own" on public.v2_suggestions
  for insert to authenticated with check (auth.uid() = user_id);
grant insert on public.v2_suggestions to authenticated;
-- читати пропозиції можна лише в панелі Supabase (Table Editor -> v2_suggestions)


-- ===== Захист від зловживань: ліміти розмірів і значень (безпечно виконувати повторно) =====
-- NOT VALID: діє для нових і змінених рядків, старі рядки не блокують виконання.
alter table public.v2_group_profiles drop constraint if exists v2_gp_limits;
alter table public.v2_group_profiles add constraint v2_gp_limits check (
  char_length(motto) <= 80
  and char_length(avatar) <= 40
  and char_length(avatar_photo) <= 200000
  and char_length(card_style) <= 20
  and jsonb_typeof(public_stats) = 'object'
  and pg_column_size(public_stats) <= 32768
  and learned_count between 0 and 200 and hard_count between 0 and 200
  and streak between 0 and 2000 and xp between 0 and 1000000
) not valid;

alter table public.v2_study_progress drop constraint if exists v2_sp_limits;
alter table public.v2_study_progress add constraint v2_sp_limits check (
  jsonb_typeof(state) = 'object' and pg_column_size(state) <= 524288
) not valid;

alter table public.v2_suggestions drop constraint if exists v2_sug_name_len;
alter table public.v2_suggestions add constraint v2_sug_name_len
  check (display_name is null or char_length(display_name) <= 40) not valid;

-- не більше 5 пропозицій на годину від одного користувача
create or replace function public.v2_sugg_rate() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.v2_suggestions
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate limit';
  end if;
  return new;
end $$;
drop trigger if exists v2_sugg_rate on public.v2_suggestions;
create trigger v2_sugg_rate before insert on public.v2_suggestions
  for each row execute function public.v2_sugg_rate();

create index if not exists v2_sug_user_idx on public.v2_suggestions(user_id);

-- анонімні (не залогінені) запити до цих таблиць не потрібні взагалі
revoke all on public.v2_study_progress, public.v2_group_profiles, public.v2_suggestions from anon;
