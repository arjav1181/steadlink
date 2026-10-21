import { getGroups, getSession } from "@golink/data";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AccountProvider } from "@/components/account-provider";
import { AppShell } from "@/components/app-shell";

import "@/server/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // No session, no workspace. A page that asked for the context without a
  // session would throw, and a person would get a server error instead of
  // the sign-in screen.
  if (!session) redirect("/sign-in");

  // The groups the workspace has, so the shell can offer the switcher.
  const groups = await getGroups({
    userId: session.userId,
    orgId: session.orgId,
    groupId: session.groupId,
  });

  return (
    <AccountProvider user={session.user} org={session.org} group={session.group} groups={groups}>
      <AppShell>{children}</AppShell>
    </AccountProvider>
  );
}
