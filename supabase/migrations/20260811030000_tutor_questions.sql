-- Ask-your-companion: students reply to a study text with a question and get an
-- answer grounded in the material already sent to them.
--
-- The table is both the history the student can look back at and the counter the
-- rolling rate limit reads, so a runaway sender cannot spend the API budget.

create table if not exists tutor_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  channel text not null check (channel in ('sms', 'app')),
  question text not null,
  answer text,
  created_at timestamptz not null default now()
);

-- The rate-limit check is "how many in the last 24h for this user", so the
-- index has to carry both columns in that order.
create index if not exists idx_tutor_questions_user_created
  on tutor_questions (user_id, created_at desc);

alter table tutor_questions enable row level security;

-- Read-only to the student. Rows are written by the edge functions with the
-- service role, which bypasses RLS — so the history cannot be forged from the
-- client to dodge the rate limit or fake an answer.
drop policy if exists "Users can read own tutor questions" on tutor_questions;
create policy "Users can read own tutor questions"
  on tutor_questions for select
  using (auth.uid() = user_id);

revoke all on tutor_questions from anon, authenticated;
grant select on tutor_questions to authenticated;
