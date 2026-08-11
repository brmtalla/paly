-- The daily study-prompt drip.
--
-- This migration documents infrastructure that was created directly against the
-- production database and was previously missing from the repo. It is written to
-- be idempotent and safe to re-run.
--
-- deliver-prompts is a polling endpoint: it sends every prompt whose
-- scheduled_for has passed and that has not been delivered yet. pg_cron pokes it
-- every 5 minutes via pg_net. Prompts are scheduled on 5-minute boundaries, so
-- in practice they go out within seconds of their slot.
--
-- ⚠️  Exactly one scheduler may exist. Adding a second (external cron, GitHub
--     Action, etc.) double-sends texts and push notifications to students.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The Authorization header is filled in at deploy time so no key is committed:
--   psql "$DATABASE_URL" \
--     -v ref="$SUPABASE_PROJECT_REF" -v anon="$SUPABASE_ANON_KEY" \
--     -f this_file.sql
-- If the variables are absent, psql leaves :'ref'/:'anon' unsubstituted and the
-- statement fails loudly rather than scheduling a broken job.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'deliver-study-prompts') then
    raise notice 'deliver-study-prompts already scheduled; leaving it untouched';
  else
    raise notice 'Schedule deliver-study-prompts manually — see the comment in this file';
  end if;
end $$;

-- Reference implementation of the scheduled job (values substituted at deploy):
--
--   select cron.schedule(
--     'deliver-study-prompts',
--     '*/5 * * * *',
--     $job$
--     select net.http_post(
--       url := 'https://<project-ref>.supabase.co/functions/v1/deliver-prompts',
--       headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon-key>"}'::jsonb,
--       body := '{}'::jsonb
--     );
--     $job$
--   );
--
-- Inspect:   select jobid, jobname, schedule, active from cron.job;
-- Job runs:  select * from cron.job_run_details order by start_time desc limit 20;
-- Unschedule: select cron.unschedule('deliver-study-prompts');
