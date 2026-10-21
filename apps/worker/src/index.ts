/**
 * The worker.
 *
 * Everything that happens on a timer runs here, in one process, against the
 * same database. pg-boss keeps the schedule and the retries in Postgres, so
 * there is no extra service to run and no job state to lose.
 *
 *   node --experimental-strip-types apps/worker/src/index.ts
 *
 * Times are UTC in the schedule. The day rollup buckets by each workspace
 * own time zone, because a click at 23:30 in Berlin is not the same day as a
 * click at 23:30 in Sydney.
 */

import { sql } from "@golink/db";
import { PgBoss } from "pg-boss";

const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  // Postgres reserves the "pg_" prefix for its own schemas, so a schema
  // called pg_boss cannot be created at all. This one also cannot collide
  // with another application's job queue in a shared database.
  schema: "golink_boss",
  // The worker crosses organizations on purpose - the rollups and the sweeps
  // are not scoped to one workspace - so it connects with BYPASSRLS.
  application_name: "golink-worker",
});

const _DAY = 86_400_000;

async function main() {
  await boss.start();

  console.log("golink worker starting");

  /* ---------------------------------------------------------------------
   * Rollups.
   *
   * The raw event log is the truth. Everything the analytics screen shows
   * is a rollup of it, so a rollup can always be recomputed.
   * ------------------------------------------------------------------- */

  await boss.createQueue("engagement.rollup-hour");
  await boss.work("engagement.rollup-hour", async () => {
    await sql().unsafe(`
      insert into engagement_rollups (
        granularity, bucket_date, bucket_hour, org_id, link_id, qr_code_id,
        page_id, dimension, dimension_value, count, updated_at
      )
      select
        'hour',
        to_char(date_trunc('hour', e.occurred_at), 'YYYY-MM-DD')::date,
        extract(hour from e.occurred_at)::smallint,
        e.org_id, e.link_id, e.qr_code_id, e.page_id,
        'total', '',
        count(*),
        now()
      from engagement_events e
      where e.occurred_at > now() - interval '2 days'
      group by 1, 2, 3, 4, 5, 6, 7
      on conflict do update
        set count = engagement_rollups.count + excluded.count,
            updated_at = now()
    `);
  });
  await boss.schedule("engagement.rollup-hour", "*/15 * * * *");

  // The day rollup buckets by the workspace time zone, so the day boundary
  // is the one the workspace sees, not the one UTC sees.
  await boss.createQueue("engagement.rollup-day");
  await boss.work("engagement.rollup-day", async () => {
    await sql().unsafe(`
      insert into engagement_rollups (
        granularity, bucket_date, bucket_hour, org_id, link_id, qr_code_id,
        page_id, dimension, dimension_value, count, updated_at
      )
      select
        'day',
        (e.occurred_at at time zone coalesce(s.timezone, 'UTC'))::date,
        -1,
        e.org_id, e.link_id, e.qr_code_id, e.page_id,
        'total', '',
        count(*),
        now()
      from engagement_events e
      left join org_settings s on s.org_id = e.org_id
      where e.occurred_at > now() - interval '3 days'
      group by 1, 2, 3, 4, 5, 6, 7
      on conflict do update
        set count = engagement_rollups.count + excluded.count,
            updated_at = now()
    `);
  });
  await boss.schedule("engagement.rollup-day", "15 2 * * *");

  // The personal data in the log is dropped once it is past the retention
  // window. The counts stay, because a count is not personal.
  await boss.createQueue("engagement.purge");
  await boss.work("engagement.purge", async () => {
    const result = await sql()`
      update engagement_events
      set ip_prefix = null, user_agent = null, referrer = null
      where occurred_at < now() - interval '90 days'
        and (ip_prefix is not null or user_agent is not null or referrer is not null)
    `;
    console.log(`purged personal data from ${result.count} events`);
  });
  await boss.schedule("engagement.purge", "0 3 * * *");

  /* ---------------------------------------------------------------------
   * Links that have run out.
   * ------------------------------------------------------------------- */

  await boss.createQueue("links.expire-check");
  await boss.work("links.expire-check", async () => {
    const result = await sql()`
      update links
      set updated_at = now()
      where expires_at is not null
        and expires_at <= now()
        and archived_at is null
    `;
    if (result.count) console.log(`${result.count} links expired`);
  });
  await boss.schedule("links.expire-check", "*/5 * * * *");

  /* ---------------------------------------------------------------------
   * Pages that are scheduled to go live.
   * ------------------------------------------------------------------- */

  await boss.createQueue("pages.publish-scheduled");
  await boss.work("pages.publish-scheduled", async () => {
    const result = await sql()`
      update pages
      set status = 'published', published_at = now(), updated_at = now()
      where status = 'scheduled'
        and scheduled_for is not null
        and scheduled_for <= now()
    `;
    if (result.count) console.log(`${result.count} pages published`);
  });
  await boss.schedule("pages.publish-scheduled", "* * * * *");

  /* ---------------------------------------------------------------------
   * Webhook delivery, with the backoff the architecture specifies:
   * 1 minute, 5, 30, 2 hours, 12 hours, and then it is dead.
   * ------------------------------------------------------------------- */

  const BACKOFF = [60, 300, 1800, 7200, 43200];

  await boss.createQueue("webhooks.deliver");
  await boss.work("webhooks.deliver", async () => {
    const due = await sql()`
      select d.id, d.webhook_id, d.payload, d.attempt, d.event_type, w.url, w.secret
      from webhook_deliveries d
      join webhooks w on w.id = d.webhook_id
      where d.status in ('pending', 'failed')
        and (d.next_attempt_at is null or d.next_attempt_at <= now())
      order by d.created_at
      limit 50
    `;

    for (const delivery of due) {
      const body = JSON.stringify(delivery.payload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await sign(delivery.secret, `${timestamp}.${body}`);

      let status = 0;
      let responseBody = "";
      try {
        const response = await fetch(delivery.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-GoLink-Event-Id": delivery.id,
            "X-GoLink-Event-Type": delivery.event_type,
            "X-GoLink-Timestamp": String(timestamp),
            "X-GoLink-Signature": `t=${timestamp},v1=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        status = response.status;
        responseBody = (await response.text().catch(() => "")).slice(0, 500);
      } catch (error) {
        responseBody = (error as Error).message;
      }

      const attempt = delivery.attempt + 1;
      const dead = status >= 400 && status < 500 && status !== 429;
      const nextStatus = status >= 200 && status < 300 ? "delivered" : dead ? "dead" : "failed";
      const nextAttempt = BACKOFF[attempt - 1] ?? null;

      await sql()`
        update webhook_deliveries
        set status = ${nextStatus}::text,
            attempt = ${attempt},
            response_status = ${status} || null,
            response_body = ${responseBody} || null,
            delivered_at = case when ${nextStatus} = 'delivered' then now() else delivered_at end,
            next_attempt_at = case
              when ${nextStatus} = 'delivered' then null
              when ${nextAttempt} is null then null
              else now() + (${nextAttempt} * interval '1 second')
            end
        where id = ${delivery.id}
      `;

      await sql()`
        update webhooks
        set last_status = ${status} || null,
            last_delivered_at = case when ${nextStatus} = 'delivered' then now() else last_delivered_at end
        where id = ${delivery.webhook_id}
      `;
    }
  });
  await boss.schedule("webhooks.deliver", "*/1 * * * *");

  /* ---------------------------------------------------------------------
   * Housekeeping.
   * ------------------------------------------------------------------- */

  await boss.createQueue("sessions.prune");
  await boss.work("sessions.prune", async () => {
    const result = await sql()`delete from "session" where expires_at < now()`;
    console.log(`pruned ${result.count} sessions`);
  });
  await boss.schedule("sessions.prune", "0 4 * * *");

  await boss.createQueue("activity.prune");
  await boss.work("activity.prune", async () => {
    const result =
      await sql()`delete from activity_log where created_at < now() - interval '90 days'`;
    console.log(`pruned ${result.count} activity entries`);
  });
  await boss.schedule("activity.prune", "15 4 * * *");

  // The counters are a cache of counts, so they can always be rebuilt from
  // the rows they come from.
  await boss.createQueue("counters.rebuild");
  await boss.work("counters.rebuild", async () => {
    await sql().unsafe(`
      update organization_counters c
      set links_count = (select count(*) from links l where l.org_id = c.org_id and l.archived_at is null),
          qr_codes_count = (select count(*) from qr_codes q where q.org_id = c.org_id and q.archived_at is null),
          pages_count = (select count(*) from pages p where p.org_id = c.org_id),
          custom_back_halves_count = (select count(*) from links l where l.org_id = c.org_id and l.archived_at is null),
          updated_at = now()
    `);
  });
  await boss.schedule("counters.rebuild", "30 4 * * *");

  // Deleted accounts are purged once the retention window closes.
  await boss.createQueue("accounts.purge");
  await boss.work("accounts.purge", async () => {
    const result = await sql()`delete from deleted_accounts where purge_after < now()`;
    console.log(`purged ${result.count} deleted accounts`);
  });
  await boss.schedule("accounts.purge", "0 5 * * *");

  console.log("golink worker ready");
}

/** HMAC-SHA256, as a hex digest. */
async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

await main();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await boss.stop({ timeout: 5000 });
    process.exit(0);
  });
}
