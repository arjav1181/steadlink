import { getCtx, getGroups, getUsers } from "@golink/data";

import { Badge, Card } from "@golink/ui";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const ctx = await getCtx();
  const [members, groups] = await Promise.all([getUsers(ctx), getGroups(ctx)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">People and groups</h1>
        <p className="mt-1 text-sm text-muted">
          Everyone in this workspace, and the groups that links are filed into.
        </p>
      </div>

      <Card className="p-0">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">People in this workspace</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2">
              {["Person", "Email", "Role"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => (
              <tr key={member.userId}>
                <td className="px-4 py-3 font-medium text-foreground">
                  {member.user?.name ?? "Unknown"}
                </td>
                <td className="px-4 py-3 text-muted">{member.user?.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={member.role === "owner" ? "ai" : "neutral"}>{member.role}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Groups</h2>
        <p className="mt-1 text-sm text-muted">
          A group files links. Every API call is scoped to one group, and each has its own
          preferences and totals.
        </p>
        <ul className="mt-4 space-y-2">
          {groups.map((group) => (
            <li
              key={group.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <span className="font-medium text-foreground">{group.name}</span>
              {group.isDefault ? <Badge tone="success">Default</Badge> : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
