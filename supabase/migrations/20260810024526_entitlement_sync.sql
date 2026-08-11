-- Server-side Paly Pro entitlement.
--
-- Paly Pro unlocks SMS/iMessage delivery and flashcards. Push notifications and
-- in-app study chunks remain free. Edge functions must decide entitlement from
-- these columns rather than trusting the client, so they are maintained only by
-- the revenuecat-webhook and grant-free-month functions (service role).

-- When the current grant lapses. Null means an active subscription with no
-- known end date; a past timestamp means expired even if is_premium is stale.
alter table profiles add column if not exists premium_until timestamptz;

create index if not exists idx_profiles_premium
  on profiles(is_premium)
  where is_premium;

-- Extend the protected-column guard from the hardening migration so a client
-- cannot grant itself Pro by writing premium_until directly. is_premium was
-- already protected there; this adds the new column to the same trigger.
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
