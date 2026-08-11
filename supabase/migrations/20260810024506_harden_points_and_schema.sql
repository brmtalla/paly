-- Paly hardening migration
--
-- 1. Reconciles schema drift: columns/constraints the application code already
--    depends on but that were never captured in a migration.
-- 2. Moves Paly Points and streak accounting server-side so a client can no
--    longer grant itself points (and therefore a free month of Paly Pro).

-- ── 1. Schema drift ──────────────────────────────────────────────────────────

-- Read by supabase/functions/grant-free-month and src/stores/studyStore.ts.
alter table profiles add column if not exists free_month_granted_at timestamptz;

-- supabase/functions/request-chunk marks on-demand deliveries as 'advance',
-- which the original CHECK constraint rejected.
alter table study_prompts drop constraint if exists study_prompts_delivery_method_check;
alter table study_prompts
  add constraint study_prompts_delivery_method_check
  check (delivery_method in ('push', 'sms', 'both', 'advance'));

-- Called by supabase/functions/deliver-prompts when a quiz is completed on time.
create or replace function increment_streak(user_id_param uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  update profiles
     set streak_count = coalesce(streak_count, 0) + 1,
         updated_at = now()
   where id = user_id_param
  returning streak_count into v_new;

  return coalesce(v_new, 0);
end;
$$;

revoke execute on function increment_streak(uuid) from public, anon, authenticated;
grant execute on function increment_streak(uuid) to service_role;

-- ── 2. Points ledger ─────────────────────────────────────────────────────────
-- Every point a user earns is an immutable ledger row. The unique constraint on
-- (user_id, reason, ref_id) makes awards idempotent: flipping the same card or
-- re-submitting the same quiz attempt cannot pay out twice.

create table if not exists paly_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  reason text not null check (reason in ('flashcard_flip', 'quiz_pass', 'reading_streak')),
  ref_id text not null,
  points integer not null check (points >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref_id)
);

create index if not exists idx_points_ledger_user_created
  on paly_points_ledger(user_id, created_at);

alter table paly_points_ledger enable row level security;

-- Read-only for clients. Writes happen exclusively through the security-definer
-- functions below, which bypass RLS.
drop policy if exists "Users can view own points ledger" on paly_points_ledger;
create policy "Users can view own points ledger"
  on paly_points_ledger for select using (auth.uid() = user_id);

-- Point values live on the server so the client cannot choose its own payout.
create or replace function points_for_reason(p_reason text)
returns integer
language sql
immutable
as $$
  select case p_reason
    when 'flashcard_flip' then 5
    when 'quiz_pass' then 10
    when 'reading_streak' then 25
    else 0
  end;
$$;

-- Recomputes profiles.paly_points from the ledger for the current month.
-- profiles.paly_points is a denormalised cache; the ledger is the source of truth.
create or replace function sync_paly_points(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
  v_total integer;
begin
  select coalesce(sum(points), 0) into v_total
    from paly_points_ledger
   where user_id = p_user_id
     and to_char(created_at, 'YYYY-MM') = v_month;

  update profiles
     set paly_points = v_total,
         paly_points_month = v_month,
         updated_at = now()
   where id = p_user_id;

  return v_total;
end;
$$;

revoke execute on function sync_paly_points(uuid) from public, anon, authenticated;

-- ── 3. Awarding points ───────────────────────────────────────────────────────
-- The caller supplies only *what happened*, never how much it is worth. The
-- function verifies the referenced record exists and belongs to the caller.

create or replace function award_paly_points(p_reason text, p_ref_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_points integer;
  v_awarded boolean := false;
  v_total integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_ref_id is null or length(trim(p_ref_id)) = 0 then
    raise exception 'A reference id is required';
  end if;

  v_points := points_for_reason(p_reason);

  if p_reason = 'flashcard_flip' then
    -- ref_id is '<synthesized_content_id>:<card_index>'
    if not exists (
      select 1 from synthesized_content
       where id = split_part(p_ref_id, ':', 1)::uuid
         and user_id = v_user
    ) then
      raise exception 'Flashcard does not belong to the current user';
    end if;

  elsif p_reason = 'quiz_pass' then
    -- ref_id is a quiz_attempts.id; the attempt must be finished and passing.
    if not exists (
      select 1 from quiz_attempts
       where id = p_ref_id::uuid
         and user_id = v_user
         and completed_at is not null
         and questions_answered > 0
         and correct_answers::numeric / questions_answered::numeric >= 0.8
    ) then
      raise exception 'No passing completed quiz attempt found for the current user';
    end if;

  else
    -- 'reading_streak' is awarded only by record_chunk_read().
    raise exception 'Reason % cannot be awarded directly', p_reason;
  end if;

  insert into paly_points_ledger (user_id, reason, ref_id, points)
  values (v_user, p_reason, p_ref_id, v_points)
  on conflict (user_id, reason, ref_id) do nothing;

  v_awarded := found;
  v_total := sync_paly_points(v_user);

  return jsonb_build_object(
    'awarded', v_awarded,
    'points', case when v_awarded then v_points else 0 end,
    'total', v_total
  );
end;
$$;

revoke execute on function award_paly_points(text, text) from public, anon;
grant execute on function award_paly_points(text, text) to authenticated;

-- ── 4. Reading streak ────────────────────────────────────────────────────────
-- Marks a study prompt as read to the bottom and advances the reading streak.
-- The streak is computed from stored dates, not from anything the client sends.

create or replace function record_chunk_read(p_prompt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_last date;
  v_streak integer;
  v_new_streak integer;
  v_awarded boolean := false;
  v_total integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  update study_prompts
     set read_at_bottom = coalesce(read_at_bottom, now()),
         read_at = coalesce(read_at, now())
   where id = p_prompt_id
     and user_id = v_user;

  if not found then
    raise exception 'Study prompt not found for the current user';
  end if;

  select reading_streak, last_read_date
    into v_streak, v_last
    from profiles
   where id = v_user
     for update;

  if v_last = v_today then
    v_new_streak := coalesce(v_streak, 0);
  elsif v_last = v_today - 1 then
    v_new_streak := coalesce(v_streak, 0) + 1;
  else
    v_new_streak := 1;
  end if;

  update profiles
     set reading_streak = v_new_streak,
         last_read_date = v_today,
         updated_at = now()
   where id = v_user;

  -- One bonus per calendar day, and only for a streak that was continued
  -- rather than restarted.
  if v_last is distinct from v_today and v_new_streak > 1 then
    insert into paly_points_ledger (user_id, reason, ref_id, points)
    values (v_user, 'reading_streak', v_today::text, points_for_reason('reading_streak'))
    on conflict (user_id, reason, ref_id) do nothing;
    v_awarded := found;
  end if;

  v_total := sync_paly_points(v_user);

  return jsonb_build_object(
    'reading_streak', v_new_streak,
    'awarded', v_awarded,
    'points', case when v_awarded then points_for_reason('reading_streak') else 0 end,
    'total', v_total
  );
end;
$$;

revoke execute on function record_chunk_read(uuid) from public, anon;
grant execute on function record_chunk_read(uuid) to authenticated;

-- ── 5. Protect the columns those functions maintain ──────────────────────────
-- RLS alone only decides *which row* a user may update, not which columns. Both
-- guards below are needed: the trigger is the hard stop, the column grants mean
-- an attempt is rejected before it ever reaches the trigger.

create or replace function guard_profile_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Edge functions (service_role) and the security-definer functions above
  -- (which run as the owner) are trusted to maintain these columns.
  if current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') then
    return new;
  end if;

  if new.paly_points is distinct from old.paly_points
     or new.paly_points_month is distinct from old.paly_points_month
     or new.reading_streak is distinct from old.reading_streak
     or new.last_read_date is distinct from old.last_read_date
     or new.streak_count is distinct from old.streak_count
     or new.is_premium is distinct from old.is_premium
     or new.free_month_granted_at is distinct from old.free_month_granted_at
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.id is distinct from old.id
  then
    raise exception 'Protected profile columns cannot be modified directly'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_protected_columns on profiles;
create trigger guard_profile_protected_columns
  before update on profiles
  for each row execute function guard_profile_protected_columns();

-- Column-level privileges: clients may only write the profile fields the UI
-- actually edits.
revoke update on profiles from anon, authenticated;
grant update (
  email,
  full_name,
  assistant_name,
  theme_color,
  phone_number,
  sms_opted_in,
  onboarding_completed,
  auto_synthesize
) on profiles to authenticated;

-- ── 6. Backfill ──────────────────────────────────────────────────────────────
-- Existing balances predate the ledger. Seed one adjustment row per user so the
-- cached totals in profiles.paly_points remain consistent with the new
-- sum-the-ledger model instead of silently resetting to zero.

insert into paly_points_ledger (user_id, reason, ref_id, points, created_at)
select id,
       'reading_streak',
       'legacy-balance-' || coalesce(nullif(paly_points_month, ''), to_char(now(), 'YYYY-MM')),
       paly_points,
       now()
  from profiles
 where paly_points > 0
   and coalesce(nullif(paly_points_month, ''), to_char(now(), 'YYYY-MM')) = to_char(now(), 'YYYY-MM')
on conflict (user_id, reason, ref_id) do nothing;
