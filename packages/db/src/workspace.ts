/**
 * What a new workspace needs before it can be used.
 *
 * A workspace is created by better-auth, which owns the organization and
 * the membership. The three things below are ours: the default group that
 * every link belongs to, the default domain the short links live on, and
 * the settings row that says which plan the workspace is on.
 *
 * Without them a new account cannot make its first link: there is no
 * domain to make it on, and no group to put it in.
 */

import { randomUUID } from "node:crypto";

import { client } from "./client.ts";

export interface WorkspaceDefaults {
  orgId: string;
  /** The workspace's slug, used for the default domain. */
  slug: string;
  /** The plan the workspace starts on. */
  planId?: string;
  timezone?: string;
}

/** The base domain new workspaces get a subdomain of. */
function baseDomain(): string {
  return process.env.DEFAULT_SHORT_DOMAIN ?? "go.arjav.is-cool.dev";
}

/**
 * Give a new workspace its group, its domain and its settings.
 *
 * It runs as the application, with the organization in scope, so the row
 * level security policies on the settings table apply.
 */
export async function createWorkspaceDefaults(input: WorkspaceDefaults): Promise<void> {
  const sql = client();
  const orgId = input.orgId;
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "workspace";

  await sql.begin(async (tx) => {
    await tx`select set_config('app.org_id', ${orgId}, true)`;

    // The plan. A deployment that has not seeded one still gets a
    // workspace, on the plan the seed left behind.
    const plans = await tx<{ id: string }[]>`
      select id from plans order by created_at limit 1
    `;
    const planId = input.planId ?? plans[0]?.id;
    if (!planId) {
      throw new Error(
        "There is no plan in the database. Run the seed, or insert a row into `plans`.",
      );
    }

    await tx`
      insert into org_settings (org_id, plan_id, timezone, is_personal)
      values (${orgId}, ${planId}, ${input.timezone ?? "UTC"}, false)
      on conflict (org_id) do nothing
    `;

    await tx`
      insert into groups (id, org_id, name, slug, is_default)
      values (${randomUUID()}, ${orgId}, 'All links', 'all-links', true)
      on conflict (org_id, slug) do nothing
    `;

    // Every workspace gets its own subdomain of the base domain, so two
    // workspaces can never ask for the same back-half.
    const host = `${slug}.${baseDomain()}`;
    await tx`
      insert into domains (id, org_id, host, kind, verification_status, verified_at)
      values (${randomUUID()}, ${orgId}, ${host}, 'default', 'verified', now())
      on conflict (host) do nothing
    `;
  });
}
