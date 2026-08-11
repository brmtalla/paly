-- 7-day free trial of Paly Pro.
--
-- Trials are store-native (Apple/Google introductory offers surfaced by
-- RevenueCat), so entitlement still arrives through revenuecat-webhook and
-- is_premium/premium_until keep working unchanged. These columns only track
-- *that it is a trial*, so the app can say "3 days left" and so we can send one
-- conversion nudge before it lapses.

-- True while the current entitlement is a trial rather than a paid period.
alter table profiles add column if not exists is_trial boolean not null default false;

-- Set the first time a user ever starts a trial. Used to prevent a second one.
alter table profiles add column if not exists trial_used_at timestamptz;

-- Stamped when the "your trial ends tomorrow" nudge goes out, so it sends once.
alter table profiles add column if not exists trial_nudge_sent_at timestamptz;

create index if not exists idx_profiles_trial_ending
  on profiles(premium_until)
  where is_trial and premium_until is not null;

-- Trial state decides access, so it belongs behind the same guard as is_premium.
create or replace function guard_profile_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') then
    return new;
  end if;

  if new.paly_points is distinct from old.paly_points
     or new.paly_points_month is distinct from old.paly_points_month
     or new.reading_streak is distinct from old.reading_streak
     or new.last_read_date is distinct from old.last_read_date
     or new.streak_count is distinct from old.streak_count
     or new.is_premium is distinct from old.is_premium
     or new.premium_until is distinct from old.premium_until
     or new.is_trial is distinct from old.is_trial
     or new.trial_used_at is distinct from old.trial_used_at
     or new.trial_nudge_sent_at is distinct from old.trial_nudge_sent_at
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
