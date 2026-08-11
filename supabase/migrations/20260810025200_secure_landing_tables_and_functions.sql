-- Close a PII exposure on the landing tables, and tighten function grants.
--
-- landing_subscribers / landing_demo_requests hold subscriber phone numbers and
-- emails. They were created without RLS on the assumption that "only edge
-- functions touch them" — but PostgREST exposes every public table to the anon
-- role, and the landing page ships the anon key in its JS bundle. Anyone could
-- therefore have dumped the subscriber list.
--
-- Enabling RLS with no policies denies anon/authenticated outright. Edge
-- functions use the service role, which bypasses RLS, so demo-subscribe and
-- demo-synthesis keep working unchanged.

alter table landing_subscribers enable row level security;
alter table landing_demo_requests enable row level security;

revoke all on landing_subscribers from anon, authenticated;
revoke all on landing_demo_requests from anon, authenticated;

-- Trigger functions are not meant to be reachable as PostgREST RPCs.
revoke execute on function guard_profile_protected_columns() from public, anon, authenticated;

-- Pin search_path (Supabase advisor: function_search_path_mutable). Without it,
-- a caller-controlled search_path can change which objects a SECURITY DEFINER
-- function resolves to.
create or replace function points_for_reason(p_reason text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_reason
    when 'flashcard_flip' then 5
    when 'quiz_pass' then 10
    when 'reading_streak' then 25
    else 0
  end;
$$;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;

-- Applied separately as `pin_update_updated_at_search_path`.
create or replace function update_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
