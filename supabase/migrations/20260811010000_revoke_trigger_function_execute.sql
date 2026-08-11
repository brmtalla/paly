-- assign_sms_link_code() is a trigger function, but PostgREST still exposes every
-- public function as an RPC endpoint. Calling it directly errors ("trigger
-- functions can only be called as triggers") so it was never exploitable, but a
-- SECURITY DEFINER function reachable by anon has no business being on the API
-- surface at all.
--
-- Split from 20260811000000 rather than folded into it: that migration is
-- already applied remotely, and editing applied migrations is the drift this
-- folder's README exists to prevent.

revoke execute on function assign_sms_link_code() from public, anon, authenticated;
