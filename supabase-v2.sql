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
