"use client";

import type { Group, Organization, User } from "@golink/data";
import { createContext, useContext } from "react";

const AccountContext = createContext<{
  user: User | null;
  org: Organization | null;
  /** The group in scope, and every group the workspace has. */
  group: Group | null;
  groups: Group[];
}>({
  user: null,
  org: null,
  group: null,
  groups: [],
});

export function AccountProvider({
  user,
  org,
  group,
  groups,
  children,
}: {
  user: User | null;
  org: Organization | null;
  group: Group | null;
  groups: Group[];
  children: React.ReactNode;
}) {
  return (
    <AccountContext.Provider value={{ user, org, group, groups }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
