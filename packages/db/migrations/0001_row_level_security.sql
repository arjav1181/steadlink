-- ============================================================================
--  Row level security.
--
--  The app connects as `steadlink_app`, which is subject to these policies. The
--  worker connects as `steadlink_worker`, which has BYPASSRLS, because the
--  rollups and the sweeps have to cross organizations.
--
--  Every request sets the transaction-local setting:
--
--      begin;
--      select set_config(app.org_id, $1, true);
--      ...
--
--  A policy that cannot read the setting denies the row, so a query that
--  forgot to scope itself returns nothing rather than everything.
--
--  The roles are created by packages/db/src/migrate.ts before this runs,
--  because CREATE ROLE cannot be conditional in plain SQL.
-- ============================================================================

--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- Enable RLS on every table that holds somebody data.
-- ---------------------------------------------------------------------------

--> statement-breakpoint
alter table org_settings enable row level security;
--> statement-breakpoint
alter table org_settings force row level security;
--> statement-breakpoint
alter table groups enable row level security;
--> statement-breakpoint
alter table groups force row level security;
--> statement-breakpoint
alter table organization_counters enable row level security;
--> statement-breakpoint
alter table organization_counters force row level security;
--> statement-breakpoint
alter table domains enable row level security;
--> statement-breakpoint
alter table domains force row level security;
--> statement-breakpoint
alter table links enable row level security;
--> statement-breakpoint
alter table links force row level security;
--> statement-breakpoint
alter table tags enable row level security;
--> statement-breakpoint
alter table tags force row level security;
--> statement-breakpoint
alter table qr_codes enable row level security;
--> statement-breakpoint
alter table qr_codes force row level security;
--> statement-breakpoint
alter table qr_code_templates enable row level security;
--> statement-breakpoint
alter table qr_code_templates force row level security;
--> statement-breakpoint
alter table barcodes_2d enable row level security;
--> statement-breakpoint
alter table barcodes_2d force row level security;
--> statement-breakpoint
alter table pages enable row level security;
--> statement-breakpoint
alter table pages force row level security;
--> statement-breakpoint
alter table campaigns enable row level security;
--> statement-breakpoint
alter table campaigns force row level security;
--> statement-breakpoint
alter table channels enable row level security;
--> statement-breakpoint
alter table channels force row level security;
--> statement-breakpoint
alter table utm_presets enable row level security;
--> statement-breakpoint
alter table utm_presets force row level security;
--> statement-breakpoint
alter table engagement_events enable row level security;
--> statement-breakpoint
alter table engagement_events force row level security;
--> statement-breakpoint
alter table engagement_rollups enable row level security;
--> statement-breakpoint
alter table engagement_rollups force row level security;
--> statement-breakpoint
alter table webhooks enable row level security;
--> statement-breakpoint
alter table webhooks force row level security;
--> statement-breakpoint
alter table bulk_uploads enable row level security;
--> statement-breakpoint
alter table bulk_uploads force row level security;
--> statement-breakpoint
alter table activity_log enable row level security;
--> statement-breakpoint
alter table activity_log force row level security;
--> statement-breakpoint
alter table ai_settings enable row level security;
--> statement-breakpoint
alter table ai_settings force row level security;
--> statement-breakpoint
alter table link_tags enable row level security;
--> statement-breakpoint
alter table link_tags force row level security;
--> statement-breakpoint
alter table link_routing_rules enable row level security;
--> statement-breakpoint
alter table link_routing_rules force row level security;
--> statement-breakpoint
alter table link_deeplinks enable row level security;
--> statement-breakpoint
alter table link_deeplinks force row level security;
--> statement-breakpoint
alter table page_blocks enable row level security;
--> statement-breakpoint
alter table page_blocks force row level security;
--> statement-breakpoint
alter table webhook_deliveries enable row level security;
--> statement-breakpoint
alter table webhook_deliveries force row level security;
--> statement-breakpoint
alter table "user" enable row level security;
--> statement-breakpoint
alter table "user" force row level security;
--> statement-breakpoint
alter table "session" enable row level security;
--> statement-breakpoint
alter table "session" force row level security;
--> statement-breakpoint
alter table "account" enable row level security;
--> statement-breakpoint
alter table "account" force row level security;
--> statement-breakpoint
alter table "verification" enable row level security;
--> statement-breakpoint
alter table "verification" force row level security;
--> statement-breakpoint
alter table "organization" enable row level security;
--> statement-breakpoint
alter table "organization" force row level security;
--> statement-breakpoint
alter table "member" enable row level security;
--> statement-breakpoint
alter table "member" force row level security;
--> statement-breakpoint
alter table "invitation" enable row level security;
--> statement-breakpoint
alter table "invitation" force row level security;
--> statement-breakpoint
alter table "apikey" enable row level security;
--> statement-breakpoint
alter table "apikey" force row level security;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Tables that carry org_id directly.
-- ---------------------------------------------------------------------------

--> statement-breakpoint
create policy org_settings_org_isolation on org_settings
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy groups_org_isolation on groups
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy organization_counters_org_isolation on organization_counters
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy domains_org_isolation on domains
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy links_org_isolation on links
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy tags_org_isolation on tags
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy qr_codes_org_isolation on qr_codes
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy qr_code_templates_org_isolation on qr_code_templates
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy barcodes_2d_org_isolation on barcodes_2d
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy pages_org_isolation on pages
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy campaigns_org_isolation on campaigns
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy channels_org_isolation on channels
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy utm_presets_org_isolation on utm_presets
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy engagement_events_org_isolation on engagement_events
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy engagement_rollups_org_isolation on engagement_rollups
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy webhooks_org_isolation on webhooks
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy bulk_uploads_org_isolation on bulk_uploads
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy activity_log_org_isolation on activity_log
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint
create policy ai_settings_org_isolation on ai_settings
  using (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- The organization and the people in it.
-- ---------------------------------------------------------------------------
create policy organization_self on "organization"
  using (id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (id = nullif(current_setting('app.org_id', true), '')::uuid);

-- A member is visible if they belong to the current organization.
create policy member_through_organization on "member"
  using (organization_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (organization_id = nullif(current_setting('app.org_id', true), '')::uuid);

-- A user is visible if they are a member of the current organization.
create policy user_through_member on "user"
  using (exists (
    select 1 from "member" m
    where m.user_id = "user".id and m.organization_id = nullif(current_setting('app.org_id', true), '')::uuid
  ));

-- A session is visible if it belongs to a visible user.
create policy session_through_user on "session"
  using (exists (
    select 1 from "user" u
    join "member" m on m.user_id = u.id
    where u.id = "session".user_id and m.organization_id = nullif(current_setting('app.org_id', true), '')::uuid
  ));

-- An account belongs to a visible user.
create policy account_through_user on "account"
  using (exists (
    select 1 from "user" u
    join "member" m on m.user_id = u.id
    where u.id = "account".user_id and m.organization_id = nullif(current_setting('app.org_id', true), '')::uuid
  ));

-- An invitation belongs to the current organization.
create policy invitation_through_organization on "invitation"
  using (organization_id = nullif(current_setting('app.org_id', true), '')::uuid)
  with check (organization_id = nullif(current_setting('app.org_id', true), '')::uuid);

-- An API key is visible if it belongs to the current organization, or to
-- a user who is a member of it.
create policy apikey_through_org_or_user on "apikey"
  using (
    (org_id is not null and org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    or (
      user_id is not null
      and exists (
        select 1 from "member" m
        where m.user_id = "apikey".user_id and m.organization_id = nullif(current_setting('app.org_id', true), '')::uuid
      )
    )
  )
  with check (
    (org_id is not null and org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    or (
      user_id is not null
      and exists (
        select 1 from "member" m
        where m.user_id = "apikey".user_id and m.organization_id = nullif(current_setting('app.org_id', true), '')::uuid
      )
    )
  );
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Tables reached through a parent row.
-- ---------------------------------------------------------------------------

--> statement-breakpoint
create policy link_tags_through_links on link_tags
  using (exists (select 1 from links p where p.id = link_tags.link_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid))
  with check (exists (select 1 from links p where p.id = link_tags.link_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid));
--> statement-breakpoint
create policy link_routing_rules_through_links on link_routing_rules
  using (exists (select 1 from links p where p.id = link_routing_rules.link_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid))
  with check (exists (select 1 from links p where p.id = link_routing_rules.link_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid));
--> statement-breakpoint
create policy link_deeplinks_through_links on link_deeplinks
  using (exists (select 1 from links p where p.id = link_deeplinks.link_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid))
  with check (exists (select 1 from links p where p.id = link_deeplinks.link_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid));
--> statement-breakpoint
create policy page_blocks_through_pages on page_blocks
  using (exists (select 1 from pages p where p.id = page_blocks.page_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid))
  with check (exists (select 1 from pages p where p.id = page_blocks.page_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid));
--> statement-breakpoint
create policy webhook_deliveries_through_webhooks on webhook_deliveries
  using (exists (select 1 from webhooks p where p.id = webhook_deliveries.webhook_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid))
  with check (exists (select 1 from webhooks p where p.id = webhook_deliveries.webhook_id and p.org_id = nullif(current_setting('app.org_id', true), '')::uuid));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Tables that are not organization-scoped.
-- ---------------------------------------------------------------------------

--> statement-breakpoint
create policy page_templates_read on page_templates for select using (true);
--> statement-breakpoint
create policy page_templates_write on page_templates for all using (true) with check (true);
--> statement-breakpoint
create policy plans_read on plans for select using (true);
--> statement-breakpoint
create policy plans_write on plans for all using (true) with check (true);
--> statement-breakpoint
create policy reserved_codes_read on reserved_codes for select using (true);
--> statement-breakpoint
create policy reserved_codes_write on reserved_codes for all using (true) with check (true);
--> statement-breakpoint
-- Verification tokens are looked up by value, before anyone is signed in.
create policy verification_service on "verification" for all using (true) with check (true);

-- The mail outbox and the deletion tombstones are service tables. The worker
-- role bypasses RLS; the request role has no access at all.
create policy mail_outbox_service on mail_outbox for all using (true) with check (true);
create policy deleted_accounts_service on deleted_accounts for all using (true) with check (true);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------------------
grant usage on schema public to steadlink_app, steadlink_worker;
grant select, insert, update, delete on all tables in schema public to steadlink_app, steadlink_worker;
grant usage, select on all sequences in schema public to steadlink_app, steadlink_worker;

revoke all on table deleted_accounts from steadlink_app;
revoke all on table mail_outbox from steadlink_app;

