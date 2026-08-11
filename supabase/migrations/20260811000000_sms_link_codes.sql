-- SMS account linking.
--
-- Until now nothing ever wrote profiles.phone_number: the onboarding screen
-- asked the student to text "Hi" to the Paly number, but an inbound text only
-- carries a phone number, with no way to tell which account sent it. The single
-- profile that did receive texts had its number set by hand.
--
-- The fix is a per-account link code. The opt-in message is pre-filled with it,
-- so the inbound webhook can resolve code → user. Texting from the handset is
-- itself proof the student owns that number, so no separate verification step
-- is needed.

-- ── 1. The code ──────────────────────────────────────────────────────────────

alter table profiles add column if not exists sms_link_code text;
alter table profiles add column if not exists sms_linked_at timestamptz;

create unique index if not exists profiles_sms_link_code_key
  on profiles(sms_link_code)
  where sms_link_code is not null;

-- Existing numbers were entered by hand in assorted formats. The webhook matches
-- on exact E.164, so normalise first or a STOP from that handset would not find
-- its row. Anything that is not a 10/11-digit NANP number is cleared rather than
-- guessed at — a wrong country code texts a stranger.
update profiles
   set phone_number = case
         when length(regexp_replace(phone_number, '\D', '', 'g')) = 10
           then '+1' || regexp_replace(phone_number, '\D', '', 'g')
         when length(regexp_replace(phone_number, '\D', '', 'g')) = 11
              and left(regexp_replace(phone_number, '\D', '', 'g'), 1) = '1'
           then '+' || regexp_replace(phone_number, '\D', '', 'g')
         else null
       end
 where phone_number is not null;

-- A number may only be linked to one account at a time, so an inbound text is
-- never ambiguous about who it came from.
create unique index if not exists profiles_phone_number_key
  on profiles(phone_number)
  where phone_number is not null;

-- Ambiguous glyphs (0/O, 1/I/L, U) are omitted: students read these off a
-- screen and retype them into a text message.
create or replace function generate_sms_link_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  code text;
  i integer;
begin
  loop
    code := '';

    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;

    exit when not exists (select 1 from profiles where sms_link_code = code);
  end loop;

  return code;
end;
$$;

revoke execute on function generate_sms_link_code() from public, anon, authenticated;

create or replace function assign_sms_link_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sms_link_code is null then
    new.sms_link_code := generate_sms_link_code();
  end if;

  return new;
end;
$$;

drop trigger if exists assign_sms_link_code on profiles;
create trigger assign_sms_link_code
  before insert on profiles
  for each row execute function assign_sms_link_code();

-- Existing accounts predate the trigger.
update profiles
   set sms_link_code = generate_sms_link_code()
 where sms_link_code is null;

alter table profiles alter column sms_link_code set not null;

-- ── 2. Lock down the columns the webhook now owns ────────────────────────────
-- phone_number and sms_opted_in were writable by the client. Nothing in the app
-- ever wrote them, but the grant meant any signed-in user could put someone
-- else's number on their own profile and have Paly text a stranger. The inbound
-- webhook is now the only writer.

revoke update on profiles from anon, authenticated;
grant update (
  email,
  full_name,
  assistant_name,
  theme_color,
  onboarding_completed,
  auto_synthesize
) on profiles to authenticated;

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
     or new.premium_until is distinct from old.premium_until
     or new.is_trial is distinct from old.is_trial
     or new.trial_used_at is distinct from old.trial_used_at
     or new.trial_nudge_sent_at is distinct from old.trial_nudge_sent_at
     or new.free_month_granted_at is distinct from old.free_month_granted_at
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     -- Identity and messaging consent: only the inbound SMS webhook sets these.
     or new.phone_number is distinct from old.phone_number
     or new.sms_opted_in is distinct from old.sms_opted_in
     or new.sms_link_code is distinct from old.sms_link_code
     or new.sms_linked_at is distinct from old.sms_linked_at
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
