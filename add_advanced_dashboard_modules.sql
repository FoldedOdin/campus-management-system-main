-- Advanced role dashboards and automation support tables
-- Run this in Supabase SQL editor.

-- Role expiry and automation metadata
alter table if exists public.users
  add column if not exists role_expires_at timestamptz null,
  add column if not exists auto_assigned_role boolean not null default false;

create table if not exists public.fund_allocations (
  id bigserial primary key,
  title text not null,
  department text not null,
  allocated_amount numeric(12,2) not null default 0,
  allocated_by uuid null references public.users(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now()
);

create table if not exists public.fund_usage_logs (
  id bigserial primary key,
  allocation_id bigint null references public.fund_allocations(id) on delete set null,
  department text not null,
  event_id bigint null references public.campus_events(id) on delete set null,
  used_amount numeric(12,2) not null default 0,
  usage_note text null,
  logged_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.conflict_tickets (
  id bigserial primary key,
  event_id bigint null references public.campus_events(id) on delete set null,
  raised_by uuid null references public.users(id) on delete set null,
  assigned_to uuid null references public.users(id) on delete set null,
  title text not null,
  description text not null,
  status text not null default 'open',
  priority text not null default 'medium',
  resolution_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_judge_assignments (
  id bigserial primary key,
  event_id bigint not null references public.campus_events(id) on delete cascade,
  judge_name text not null,
  judge_email text null,
  assigned_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.live_scores (
  id bigserial primary key,
  event_id bigint not null references public.campus_events(id) on delete cascade,
  team_a text not null,
  team_b text not null,
  score_a integer not null default 0,
  score_b integer not null default 0,
  status text not null default 'scheduled',
  updated_by uuid null references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ground_bookings (
  id bigserial primary key,
  ground_name text not null,
  event_id bigint null references public.campus_events(id) on delete set null,
  booked_for date not null,
  start_time time not null,
  end_time time not null,
  booked_by uuid null references public.users(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now()
);

create table if not exists public.magazine_articles (
  id bigserial primary key,
  title text not null,
  body text not null,
  author_id uuid null references public.users(id) on delete set null,
  status text not null default 'submitted',
  featured boolean not null default false,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.magazine_comments (
  id bigserial primary key,
  article_id bigint not null references public.magazine_articles(id) on delete cascade,
  user_id uuid null references public.users(id) on delete set null,
  comment_text text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.blockchain_hash_logs (
  id bigserial primary key,
  log_type text not null,
  entity_id text not null,
  hash_value text not null,
  tx_hash text null,
  signature text null,
  wallet_address text null,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.approval_logs (
  id bigserial primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  from_status text null,
  to_status text null,
  notes text null,
  approved_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id bigserial primary key,
  actor_id uuid null references public.users(id) on delete set null,
  actor_role text null,
  action text not null,
  module text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.student_grievances (
  id bigserial primary key,
  student_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'open',
  admin_response text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_suggestions (
  id bigserial primary key,
  student_id uuid null references public.users(id) on delete set null,
  suggestion text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.achievement_wallet (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  achievement_type text not null,
  reference_type text null,
  reference_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
