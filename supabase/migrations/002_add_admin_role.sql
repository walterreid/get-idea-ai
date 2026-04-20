-- Phase 8.1 — Admin role on profiles.
--
-- Adds a role column to profiles with a CHECK constraint limiting values to
-- 'user' or 'admin'. The default is 'user', so:
--   - the handle_new_user() trigger (which INSERTs only id + display_name)
--     continues to work unchanged
--   - existing rows inherit 'user' implicitly via the default
--
-- Admin promotion is handled by scripts/init-admin.ts (out-of-band, idempotent)
-- rather than in this migration, because:
--   - the admin email is environment-specific (ADMIN_EMAIL in .env.local)
--   - the migration should be safe to run against any environment
--   - keeping role promotion in a script lets us re-run it as ownership changes
--
-- A partial index on role != 'user' keeps admin lookups fast while not paying
-- storage cost for the common case.
--
-- This column is consumed by lib/auth/role.ts (getCurrentUserRole / isAdmin).
-- Phase 8.2+ will extend RLS policies to grant admin additional capabilities;
-- this migration is inert until those policies land.

alter table profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

create index if not exists idx_profiles_role on profiles(role) where role != 'user';
