# Migrations — read before running `db push`

Production was originally built through the Supabase dashboard, not this folder.
These files are partly a **reconstruction** of that schema, so local history and
remote history do not line up one-to-one.

## Current state

| File | Applied remotely? | Notes |
|---|---|---|
| `20260101000000_initial_schema.sql` | ❌ not under this version | Reconstruction of the original dashboard-created tables. Remote applied them as `create_core_tables`, `add_full_name_to_profiles`, `add_class_details_fields`, `add_quiz_enforcement_columns`, `add_paly_points_and_streaks`. |
| `20260227154707_setup_deliver_prompts_cron.sql` | ✅ | Documents the pg_cron drip that already exists. Descriptive only — it does not schedule anything. |
| `20260422000000_landing_page.sql` | ✅ (as `landing_page`) | Version prefix differs from remote. |
| `20260810024506_harden_points_and_schema.sql` | ✅ | Versions match remote. |
| `20260810024526_entitlement_sync.sql` | ✅ | Versions match remote. |
| `20260810025200_secure_landing_tables_and_functions.sql` | ✅ | Versions match remote. |
| `20260810030000_free_trial_support.sql` | ✅ (as `free_trial_support`) | ⚠️ Remote recorded it as `20260810141052`; the local prefix differs. |
| `20260811000000_sms_link_codes.sql` | ✅ | Versions match remote. Adds `sms_link_code`, normalises `phone_number` to E.164, and moves `phone_number`/`sms_opted_in` out of the client-writable grant so only the inbound webhook can set them. |

## Consequences

- **`supabase db push` against production is not safe as-is.** It would try to
  apply `20260101000000_initial_schema.sql`, whose `create policy` statements
  have no `if not exists` and will error against the live schema.
- To verify what is actually deployed, query the database rather than trusting
  this folder:

  ```sql
  select version, name from supabase_migrations.schema_migrations order by version;
  ```

- For a **fresh** environment (local dev, a new staging project), applying these
  files in order does produce the right schema.

## Rules going forward

1. Every schema change gets a migration file here, committed in the same change
   as the code that depends on it. Drift already caused one production bug:
   `grant-free-month` read `profiles.free_month_granted_at`, a column no
   migration created.
2. New public tables **must** enable RLS. PostgREST exposes every public table
   to the `anon` role, and the anon key ships inside the app and the landing
   page bundle. This is how `landing_subscribers` (phone numbers, emails) ended
   up publicly readable — see `20260810025200`.
3. Columns that represent money, entitlement, or earned progress
   (`is_premium`, `premium_until`, `paly_points`, streaks) must stay in the
   `guard_profile_protected_columns` trigger and out of the `authenticated`
   column grants.
