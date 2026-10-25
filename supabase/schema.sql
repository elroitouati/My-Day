-- ============================================================================
--  My Day ↔ פנמ"צ — הגדרת Supabase
--  להדביק את כל הקובץ ב: Supabase → SQL Editor → New query → Run
--  אפשר להריץ שוב בלי נזק (כל הפקודות בטוחות להרצה חוזרת).
-- ============================================================================

-- 1) הטבלה המשותפת: יעדי האימון של כל יום והאם בוצעו
create table if not exists public.panmatz_daily (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  date       date        not null,
  goal_id    text        not null,
  title      text        not null default '',
  target     text        not null default '',
  done       boolean     not null default false,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, date, goal_id)  -- מונע כפילויות
);

create index if not exists panmatz_daily_user_date on public.panmatz_daily (user_id, date);

-- 2) אבטחה: כל משתמש רואה ומשנה רק את השורות שלו (RLS)
alter table public.panmatz_daily enable row level security;

drop policy if exists "panmatz_daily select own" on public.panmatz_daily;
drop policy if exists "panmatz_daily insert own" on public.panmatz_daily;
drop policy if exists "panmatz_daily update own" on public.panmatz_daily;
drop policy if exists "panmatz_daily delete own" on public.panmatz_daily;

create policy "panmatz_daily select own" on public.panmatz_daily
  for select to authenticated using (auth.uid() = user_id);
create policy "panmatz_daily insert own" on public.panmatz_daily
  for insert to authenticated with check (auth.uid() = user_id);
create policy "panmatz_daily update own" on public.panmatz_daily
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "panmatz_daily delete own" on public.panmatz_daily
  for delete to authenticated using (auth.uid() = user_id);

-- 3) "האחרון קובע": עדכון עם updated_at ישן יותר מהקיים פשוט לא נכתב.
--    כך שינוי שנשלח מתור אופליין לא דורס שינוי חדש יותר מהצד השני.
create or replace function public.panmatz_daily_last_write_wins()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at < old.updated_at then
    return null; -- מדלגים על העדכון
  end if;
  return new;
end;
$$;

drop trigger if exists panmatz_daily_lww on public.panmatz_daily;
create trigger panmatz_daily_lww
  before update on public.panmatz_daily
  for each row execute function public.panmatz_daily_last_write_wins();

-- 4) Realtime: שינוי באפליקציה אחת מגיע מיד לשנייה
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'panmatz_daily'
  ) then
    alter publication supabase_realtime add table public.panmatz_daily;
  end if;
end;
$$;

-- 5) גיבוי מלא של פנמ"צ (כפתור "גיבוי לענן / שחזור")
create table if not exists public.panmatz_backup (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  state      jsonb       not null,
  updated_at timestamptz not null default now()
);

alter table public.panmatz_backup enable row level security;

drop policy if exists "panmatz_backup own" on public.panmatz_backup;
create policy "panmatz_backup own" on public.panmatz_backup
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
