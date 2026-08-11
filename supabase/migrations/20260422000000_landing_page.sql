-- Landing page: subscribers who opt in for updates
create table if not exists landing_subscribers (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  email text,
  sms_opt_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Landing page: demo request log for rate-limiting and analytics
create table if not exists landing_demo_requests (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  file_name text,
  text_length integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_landing_demo_phone_date
  on landing_demo_requests(phone_number, created_at);

-- NOTE: these tables were originally created without RLS on the mistaken
-- assumption that only the service role reaches them. PostgREST exposes every
-- public table to anon, so they were readable with the landing page's anon key.
-- Fixed in 20260722010000_secure_landing_tables_and_functions.sql — do not
-- create new public tables without RLS.
