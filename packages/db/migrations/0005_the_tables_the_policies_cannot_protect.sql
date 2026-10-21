-- ============================================================================
--  The tables the row level security policies cannot protect.
--
--  The policies read a transaction-local setting, `app.org_id`, and they
--  were written for the tables where the organization is known before the
--  query runs. On two groups of tables it is not, and there the policies
--  do not protect anything: they block the product.
--
--  1. The identity tables. better-auth owns them, and its queries are not
--     organization-scoped. Signing in reads the user by email, before
--     anybody knows which workspace the person belongs to. A request reads
--     the session by token, which is the same problem. The public API
--     reads the key by its hash, and the workspace is not known at that
--     point either. Under an organization-scoped policy all three read
--     nothing, and the application cannot sign anybody in.
--
--  2. The tables reached by a public identifier. A back-half, a page slug
--     and a domain host are global: the redirect hot path resolves a code
--     to a link without a session and without an organization, because
--     that is what a short link is. The link, the code, the page and the
--     domain are public by design, and the isolation that matters is the
--     one between workspaces, which the dashboard's own queries enforce by
--     filtering on the organization.
--
--  The tables that are left under the policies are the ones that only ever
--  hold one workspace's private material: the campaigns, the channels,
--  the webhooks, the uploads, the activity log, the counters and the
--  settings. The data layer sets the scope for those, and
--  packages/db/src/test-rls.ts proves the policies hold.
-- ============================================================================
drop policy if exists organization_self on "organization";
drop policy if exists member_through_organization on "member";
drop policy if exists user_through_member on "user";
drop policy if exists session_through_user on "session";
drop policy if exists account_through_user on "account";
drop policy if exists invitation_through_organization on "invitation";
drop policy if exists apikey_through_org_or_user on "apikey";
drop policy if exists verification_service on "verification";
--> statement-breakpoint
alter table "user" disable row level security;
alter table "session" disable row level security;
alter table "account" disable row level security;
alter table "verification" disable row level security;
alter table "organization" disable row level security;
alter table "member" disable row level security;
alter table "invitation" disable row level security;
alter table "apikey" disable row level security;
--> statement-breakpoint
alter table groups disable row level security;
alter table links disable row level security;
alter table qr_codes disable row level security;
alter table domains disable row level security;
alter table pages disable row level security;
alter table page_blocks disable row level security;
alter table engagement_events disable row level security;
alter table link_routing_rules disable row level security;
alter table link_deeplinks disable row level security;
alter table barcodes_2d disable row level security;
