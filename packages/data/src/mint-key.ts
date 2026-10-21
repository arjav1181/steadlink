/**
 * A throwaway script: mint an API key and print it.
 *
 * Used to exercise the public API from the shell. It is not part of the
 * app and it is not seeded — a token is something a person creates.
 */

import { createApiKey } from "@golink/data";
import { sql } from "@golink/db";

const rows = await sql()`
  select user_id, organization_id from member order by created_at limit 1
`;
const member = rows[0];
if (!member) throw new Error("no members in the database");

const scopes = process.argv[2]
  ? process.argv[2].split(",")
  : [
      "links:read",
      "links:write",
      "qr:read",
      "qr:write",
      "pages:read",
      "pages:write",
      "groups:read",
      "groups:write",
      "campaigns:read",
      "campaigns:write",
      "analytics:read",
    ];

const key = await createApiKey(
  { userId: member.user_id, orgId: member.organization_id, groupId: "" },
  "shell test",
  scopes,
);
console.log(key.token);
await sql().end();
