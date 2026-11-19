-- ============================================================
-- GYM PERFORMANCE TRACKING SYSTEM - DATABASE SCHEMA
-- PostgreSQL / Supabase
-- ============================================================

-- USERS
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  name text not null,
  created_at timestamptz default now()
);

-- Username unique tanpa membedakan huruf besar/kecil.
create unique index if not exists users_username_normalized
  on users (lower(trim(username)));

-- SPLITS
create table if not exists splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz default now()
);

-- SESSIONS
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- EXERCISES
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- prevent duplicate exercise names per user (case + whitespace insensitive)
create unique index if not exists exercises_user_normalized_name
  on exercises (user_id, lower(trim(name)));

-- WORKOUTS (actual performed workout on a date)
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  date date not null,
  created_at timestamptz default now()
);

-- WORKOUT_EXERCISES (junction: workout <-> exercise)
create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade
);

-- SETS (weight x reps)
create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_number int not null,
  weight numeric(6,2) not null check (weight >= 0),
  reps int not null check (reps >= 0)
);

-- indexes for common lookups
create index if not exists idx_splits_user on splits(user_id);
create index if not exists idx_sessions_split on sessions(split_id);
create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_exercises_user on exercises(user_id);
create index if not exists idx_workouts_user on workouts(user_id);
create index if not exists idx_workouts_session on workouts(session_id);
create index if not exists idx_we_workout on workout_exercises(workout_id);
create index if not exists idx_we_exercise on workout_exercises(exercise_id);
create index if not exists idx_ws_we on workout_sets(workout_exercise_id);
