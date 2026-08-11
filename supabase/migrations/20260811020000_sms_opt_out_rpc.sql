-- In-app opt-out for study texts.
--
-- sms_opted_in is otherwise writable only by the inbound webhook, because
-- opting *in* requires proof the student owns the handset (they text us their
-- link code). Opting *out* needs no such proof — the worst a caller can do is
-- silence their own messages — and forcing someone to text STOP just to stop
-- receiving texts is a dark pattern the settings screen should not have.
--
-- Deliberately one-way: this function cannot set the flag to true.

create or replace function revoke_sms_consent()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  update profiles
     set sms_opted_in = false,
         updated_at = now()
   where id = v_user;

  return found;
end;
$$;

revoke execute on function revoke_sms_consent() from public, anon;
grant execute on function revoke_sms_consent() to authenticated;
