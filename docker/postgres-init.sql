-- The roles the row level security policies refer to.
--
-- The application connects as `golink`, which is a member of `golink_app`.
-- Membership of a role with BYPASSRLS is inherited, so the application
-- role must NOT be a member of `golink_worker`: if it were, every query
-- would bypass the policies and the isolation would be theatre.
--
-- The worker connects as `golinkworker`, which IS a member of
-- `golink_worker`, because the rollups and the sweeps cross organizations.
--
-- This runs as the Postgres superuser, once, when the data directory is
-- created. The blocks are here because psql can run them; the application
-- client cannot.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'golink_app') then
    create role golink_app nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'golink_worker') then
    create role golink_worker nologin bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'golink') then
    create role golink login password 'golink';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'golinkworker') then
    create role golinkworker login password 'golinkworker';
  end if;
end
$$;

grant golink_app to golink;
grant golink_worker to golinkworker;
