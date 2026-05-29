-- Tutor / Student progress schema for Supabase
-- Run this alongside your existing setup_database.sql

-- Extensions (if not already enabled)
create extension if not exists pgcrypto;

-- Table: tutor_assignments
create table if not exists tutor_assignments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references profiles(id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz default now(),
  due_date timestamptz,
  max_score int default 5
);

-- Table: assignment_submissions
create table if not exists assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references tutor_assignments(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  content text,
  submitted_at timestamptz default now(),
  score int check (score >= 0 and score <= 5),
  feedback text
);

-- Table: daily_study_time (aggregate minutes per user per day)
create table if not exists daily_study_time (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  minutes int default 0,
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Table: student_daily_rating (daily 0-5 rating given by the tutor/AI)
create table if not exists student_daily_rating (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  rating int check (rating >= 0 and rating <= 5),
  note text,
  rated_at timestamptz default now(),
  unique(user_id, date)
);

-- Optional indexes for faster queries
create index if not exists idx_daily_study_time_user_date on daily_study_time(user_id, date);
create index if not exists idx_student_daily_rating_user_date on student_daily_rating(user_id, date);

-- Table: daily_reports (aggregated daily summary + running grade)
create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  current_grade double precision,
  eval_count int default 0,
  topics_covered text[],
  teacher_notes text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create index if not exists idx_daily_reports_user_date on daily_reports(user_id, date);
