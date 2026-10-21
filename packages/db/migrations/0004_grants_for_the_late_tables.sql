-- ============================================================================
--  Grants, again, for the tables that did not exist yet.
--
--  Migration 0001 granted the privileges on "all tables in schema public".
--  It ran second, and three tables were created after it: `mail_outbox`
--  and `deleted_accounts` are in the base migration, but `jwks` came with
--  the JWT plugin in 0002, and `deleted_accounts` was added afterwards.
--
--  The result was that the application role had no privilege at all on
--  those tables. In the container deployment that is not a warning: the
--  mail sender cannot write a message, and better-auth cannot read its
--  signing keys, and both fail quietly.
--
--  The grant is repeated here, and the migration runner repeats it after
--  every run, so a table added by a later migration is not stranded.
-- ============================================================================
grant usage on schema public to golink_app, golink_worker;
grant select, insert, update, delete on all tables in schema public to golink_app, golink_worker;
grant usage, select on all sequences in schema public to golink_app, golink_worker;
--> statement-breakpoint

-- The application writes outgoing mail, so a local install with no mail
-- provider still has the message to look at. It never reads it: a password
-- reset token belonging to another workspace is not the application's
-- business, and the table has no organization column to filter on.
revoke select on table mail_outbox from golink_app;
--> statement-breakpoint

-- The list of deleted accounts belongs to the worker alone. It is the part
-- that decides what may be purged, and the application never touches it.
revoke all on table deleted_accounts from golink_app;
