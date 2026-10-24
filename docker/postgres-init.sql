-- The roles the row level security policies refer to.
--
-- The application connects as `steadlink`, which is a member of `steadlink_app`.
-- Membership of a role with BYPASSRLS is inherited, so the application
-- role must NOT be a member of `steadlink_worker`: if it were, every query
-- would bypass the policies and the isolation would be theatre.
--
-- The worker connects as `steadlinkworker`, which IS a member of
-- `steadlink_worker`, because the rollups and the sweeps cross organizations.
--
-- This runs as the Postgres superuser, once, when the data directory is
-- created. The blocks are here because psql can run them; the application
-- client cannot.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'steadlink_app') then
    create role steadlink_app nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'steadlink_worker') then
    create role steadlink_worker nologin bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'steadlink') then
    create role steadlink login password 'steadlink';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'steadlinkworker') then
    create role steadlinkworker login password 'steadlinkworker';
  end if;
end
$$;

grant steadlink_app to steadlink;
grant steadlink_worker to steadlinkworker;
