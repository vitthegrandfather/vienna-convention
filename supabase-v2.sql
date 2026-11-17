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

create policy "own progress" on public.v2_study_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read ranking" on public.v2_group_profiles
  for select using (auth.role() = 'authenticated');
create policy "write own profile" on public.v2_group_profiles
  for insert with check (auth.uid() = user_id);
create policy "update own profile" on public.v2_group_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


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
