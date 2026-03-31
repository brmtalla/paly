-- Paly initial schema migration
-- This represents the current production schema.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  assistant_name text not null default 'Paly',
  theme_color text not null default '#6366F1',
  phone_number text,
  sms_opted_in boolean not null default false,
  is_premium boolean not null default false,
  stripe_customer_id text,
  onboarding_completed boolean not null default false,
  streak_count integer not null default 0,
  paly_points integer not null default 0,
  paly_points_month text not null default '',
  reading_streak integer not null default 0,
  last_read_date date,
  auto_synthesize boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  color text,
  location text,
  start_date date,
  end_date date,
  instructor_name text,
  instructor_email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  day_of_week integer check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_recurring boolean not null default true,
  specific_date date,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text,
  content text,
  session_date date not null,
  is_synthesized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete set null,
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  extracted_text text,
  session_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists synthesized_content (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  session_date date not null,
  summary text,
  key_takeaways jsonb not null default '[]'::jsonb,
  flashcards jsonb not null default '[]'::jsonb,
  quiz_questions jsonb not null default '[]'::jsonb,
  daily_chunks jsonb not null default '[]'::jsonb,
  source_note_ids uuid[] not null default '{}',
  source_upload_ids uuid[] not null default '{}',
  next_class_date date,
  quiz_deadline_notified integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists study_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  synthesized_content_id uuid references synthesized_content(id) on delete set null,
  prompt_type text not null check (prompt_type in ('takeaway', 'recall', 'quiz', 'flashcard')),
  content text not null,
  scheduled_for timestamptz not null,
  delivered_at timestamptz,
  read_at timestamptz,
  read_at_bottom timestamptz,
  delivery_method text not null default 'both' check (delivery_method in ('push', 'sms', 'both')),
  day_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  synthesized_content_id uuid references synthesized_content(id) on delete set null,
  questions_answered integer not null default 0,
  correct_answers integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  push_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  class_reminders boolean not null default true,
  study_prompts boolean not null default true,
  quiz_reminders boolean not null default true,
  snooze_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

-- Indexes for common query patterns
create index if not exists idx_classes_user_id on classes(user_id);
create index if not exists idx_notes_class_id on notes(class_id);
create index if not exists idx_notes_user_id on notes(user_id);
create index if not exists idx_study_prompts_user_scheduled on study_prompts(user_id, scheduled_for);
create index if not exists idx_study_prompts_delivered on study_prompts(delivered_at) where delivered_at is null;
create index if not exists idx_synthesized_content_class on synthesized_content(class_id, user_id);
create index if not exists idx_quiz_attempts_content on quiz_attempts(synthesized_content_id);

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table classes enable row level security;
alter table class_sessions enable row level security;
alter table availability_blocks enable row level security;
alter table notes enable row level security;
alter table uploads enable row level security;
alter table synthesized_content enable row level security;
alter table study_prompts enable row level security;
alter table quiz_attempts enable row level security;
alter table notification_preferences enable row level security;
alter table push_tokens enable row level security;

-- RLS policies: users can only access their own data
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can CRUD own classes" on classes for all using (auth.uid() = user_id);
create policy "Users can CRUD own class sessions" on class_sessions for all using (
  class_id in (select id from classes where user_id = auth.uid())
);

create policy "Users can CRUD own availability" on availability_blocks for all using (auth.uid() = user_id);
create policy "Users can CRUD own notes" on notes for all using (auth.uid() = user_id);
create policy "Users can CRUD own uploads" on uploads for all using (auth.uid() = user_id);
create policy "Users can CRUD own synthesized content" on synthesized_content for all using (auth.uid() = user_id);
create policy "Users can CRUD own study prompts" on study_prompts for all using (auth.uid() = user_id);
create policy "Users can CRUD own quiz attempts" on quiz_attempts for all using (auth.uid() = user_id);
create policy "Users can CRUD own notification prefs" on notification_preferences for all using (auth.uid() = user_id);
create policy "Users can CRUD own push tokens" on push_tokens for all using (auth.uid() = user_id);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
