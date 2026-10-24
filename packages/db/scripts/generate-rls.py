#!/usr/bin/env python3
"""Generate the row-level-security migration as plain SQL.

Two things the client forces on us:

  * It scans queries for statement boundaries and does not skip SQL comments,
    so an apostrophe inside a comment derails the parse. Every comment here is
    apostrophe-free.
  * It cannot parse a dollar-quoted body, so there are no DO blocks and no
    function definitions. The organization scope is inlined into each policy.

Run:  python3 packages/db/scripts/generate-rls.py
"""

import pathlib

HERE = pathlib.Path(__file__).resolve().parents[1]
OUT = HERE / "migrations" / "0001_row_level_security.sql"

MARKER = "\n--> statement-breakpoint\n"

# The expression that reads the transaction-local organization.
SCOPE = "nullif(current_setting('app.org_id', true), '')::uuid"

# Tables that carry org_id directly.
DIRECT = [
    "org_settings", "groups", "organization_counters", "domains", "links", "tags",
    "qr_codes", "qr_code_templates", "barcodes_2d", "pages", "campaigns",
    "channels", "utm_presets", "engagement_events", "engagement_rollups",
    "webhooks", "bulk_uploads", "activity_log", "ai_settings",
]

# better-auth tables. `user` is a reserved word in Postgres, so these are
# always quoted.
AUTH = ["user", "session", "account", "verification", "organization", "member",
        "invitation", "apikey"]

# Tables reached through a parent row: child, parent, foreign key.
THROUGH = [
    ("link_tags", "links", "link_id"),
    ("link_routing_rules", "links", "link_id"),
    ("link_deeplinks", "links", "link_id"),
    ("page_blocks", "pages", "page_id"),
    ("webhook_deliveries", "webhooks", "webhook_id"),
]

GLOBAL = ["page_templates", "plans", "reserved_codes"]

HEADER = """-- ============================================================================
--  Row level security.
--
--  The app connects as `steadlink_app`, which is subject to these policies. The
--  worker connects as `steadlink_worker`, which has BYPASSRLS, because the
--  rollups and the sweeps have to cross organizations.
--
--  Every request sets the transaction-local setting:
--
--      begin;
--      select set_config('app.org_id', $1, true);
--      ...
--
--  A policy that cannot read the setting denies the row, so a query that
--  forgot to scope itself returns nothing rather than everything.
--
--  The roles are created by packages/db/src/migrate.ts before this runs,
--  because CREATE ROLE cannot be conditional in plain SQL.
-- ============================================================================
"""

FOOTER = """
-- ---------------------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------------------
grant usage on schema public to steadlink_app, steadlink_worker;
grant select, insert, update, delete on all tables in schema public to steadlink_app, steadlink_worker;
grant usage, select on all sequences in schema public to steadlink_app, steadlink_worker;

revoke all on table deleted_accounts from steadlink_app;
revoke all on table mail_outbox from steadlink_app;
"""


def q(name: str) -> str:
    """Quote the reserved names."""
    return f'"{name}"' if name in AUTH else name


def main() -> int:
    parts: list[str] = [HEADER]

    parts.append(
        "-- ---------------------------------------------------------------------------\n"
        "-- Enable RLS on every table that holds somebody data.\n"
        "-- ---------------------------------------------------------------------------\n"
    )
    for table in DIRECT + [t[0] for t in THROUGH] + AUTH:
        parts.append(f"alter table {q(table)} enable row level security;")
        parts.append(f"alter table {q(table)} force row level security;")

    parts.append(
        "\n-- ---------------------------------------------------------------------------\n"
        "-- Tables that carry org_id directly.\n"
        "-- ---------------------------------------------------------------------------\n"
    )
    for table in DIRECT:
        parts.append(
            f"create policy {table}_org_isolation on {table}\n"
            f"  using (org_id = {SCOPE})\n"
            f"  with check (org_id = {SCOPE});"
        )

    parts.append(
        "\n-- ---------------------------------------------------------------------------\n"
        "-- The organization and the people in it.\n"
        "-- ---------------------------------------------------------------------------\n"
        f"create policy organization_self on {q('organization')}\n"
        f"  using (id = {SCOPE})\n"
        f"  with check (id = {SCOPE});\n"
        "\n"
        "-- A member is visible if they belong to the current organization.\n"
        f"create policy member_through_organization on {q('member')}\n"
        f"  using (organization_id = {SCOPE})\n"
        f"  with check (organization_id = {SCOPE});\n"
        "\n"
        "-- A user is visible if they are a member of the current organization.\n"
        f"create policy user_through_member on {q('user')}\n"
        "  using (exists (\n"
        f"    select 1 from {q('member')} m\n"
        f"    where m.user_id = {q('user')}.id and m.organization_id = {SCOPE}\n"
        "  ));\n"
        "\n"
        "-- A session is visible if it belongs to a visible user.\n"
        f"create policy session_through_user on {q('session')}\n"
        "  using (exists (\n"
        f"    select 1 from {q('user')} u\n"
        f"    join {q('member')} m on m.user_id = u.id\n"
        f"    where u.id = {q('session')}.user_id and m.organization_id = {SCOPE}\n"
        "  ));\n"
        "\n"
        "-- An account belongs to a visible user.\n"
        f"create policy account_through_user on {q('account')}\n"
        "  using (exists (\n"
        f"    select 1 from {q('user')} u\n"
        f"    join {q('member')} m on m.user_id = u.id\n"
        f"    where u.id = {q('account')}.user_id and m.organization_id = {SCOPE}\n"
        "  ));\n"
        "\n"
        "-- An invitation belongs to the current organization.\n"
        f"create policy invitation_through_organization on {q('invitation')}\n"
        f"  using (organization_id = {SCOPE})\n"
        f"  with check (organization_id = {SCOPE});\n"
        "\n"
        "-- An API key is visible if it belongs to the current organization, or to\n"
        "-- a user who is a member of it.\n"
        f"create policy apikey_through_org_or_user on {q('apikey')}\n"
        "  using (\n"
        f"    (org_id is not null and org_id = {SCOPE})\n"
        "    or (\n"
        "      user_id is not null\n"
        "      and exists (\n"
        f"        select 1 from {q('member')} m\n"
        f"        where m.user_id = {q('apikey')}.user_id and m.organization_id = {SCOPE}\n"
        "      )\n"
        "    )\n"
        "  )\n"
        "  with check (\n"
        f"    (org_id is not null and org_id = {SCOPE})\n"
        "    or (\n"
        "      user_id is not null\n"
        "      and exists (\n"
        f"        select 1 from {q('member')} m\n"
        f"        where m.user_id = {q('apikey')}.user_id and m.organization_id = {SCOPE}\n"
        "      )\n"
        "    )\n"
        "  );"
    )

    parts.append(
        "\n-- ---------------------------------------------------------------------------\n"
        "-- Tables reached through a parent row.\n"
        "-- ---------------------------------------------------------------------------\n"
    )
    for child, parent, key in THROUGH:
        parts.append(
            f"create policy {child}_through_{parent} on {child}\n"
            f"  using (exists (select 1 from {parent} p where p.id = {child}.{key} and p.org_id = {SCOPE}))\n"
            f"  with check (exists (select 1 from {parent} p where p.id = {child}.{key} and p.org_id = {SCOPE}));"
        )

    parts.append(
        "\n-- ---------------------------------------------------------------------------\n"
        "-- Tables that are not organization-scoped.\n"
        "-- ---------------------------------------------------------------------------\n"
    )
    for table in GLOBAL:
        parts.append(f"create policy {table}_read on {table} for select using (true);")
        parts.append(
            f"create policy {table}_write on {table} for all using (true) with check (true);"
        )
    parts.append(
        "-- Verification tokens are looked up by value, before anyone is signed in.\n"
        f"create policy verification_service on {q('verification')} for all using (true) with check (true);\n"
        "\n"
        "-- The mail outbox and the deletion tombstones are service tables. The worker\n"
        "-- role bypasses RLS; the request role has no access at all.\n"
        "create policy mail_outbox_service on mail_outbox for all using (true) with check (true);\n"
        "create policy deleted_accounts_service on deleted_accounts for all using (true) with check (true);"
    )

    parts.append(FOOTER)

    text = MARKER.join(part for part in parts if part.strip()) + "\n"

    # The client scans for statement boundaries and does not skip SQL
    # comments, so an apostrophe inside a comment derails the whole parse.
    cleaned = []
    for line in text.split("\n"):
        if line.lstrip().startswith("--"):
            line = line.replace("'", "")
        cleaned.append(line)
    text = "\n".join(cleaned)

    OUT.write_text(text, encoding="utf-8")
    print(
        f"wrote {OUT} "
        f"({len(DIRECT)} direct, {len(THROUGH)} through, {len(AUTH)} auth, {len(GLOBAL)} global)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
