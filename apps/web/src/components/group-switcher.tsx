"use client";

import type { Group } from "@steadlink/data";
import { Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { setActiveGroupAction } from "@/app/actions";

/**
 * Which group you are working in.
 *
 * A group partitions the workspace's links and codes, so the number of
 * groups a workspace has decides how many separate sets of links it can
 * keep. The picker is in the top bar rather than the rail, because the
 * rail is a column of icons and this is a name worth reading.
 */
export function GroupSwitcher({ groups, active }: { groups: Group[]; active: Group | null }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState<string | null>(null);
  const current = active;
  const currentId = active?.id ?? "";

  // A workspace with one group has nothing to switch between, and a
  // workspace whose group could not be read has nothing to show.
  if (!current || groups.length <= 1) return null;

  async function choose(groupId: string) {
    if (groupId === currentId) return;
    setBusy(true);
    setFailed(null);
    const result = await setActiveGroupAction(groupId);
    setBusy(false);
    if (result.ok) {
      // The screens read the group from the session, so the whole page has
      // to be drawn again with the new one in scope.
      router.refresh();
      return;
    }
    setFailed(result.error ?? "That group could not be opened.");
  }

  return (
    <div className="flex items-center gap-2">
      <Folder aria-hidden="true" className="hidden size-4 text-muted sm:block" />
      <label htmlFor="group-switcher" className="text-sm text-muted">
        Group
      </label>
      <select
        id="group-switcher"
        name="group"
        value={currentId}
        disabled={busy}
        onChange={(event) => void choose(event.target.value)}
        className="h-8 max-w-28 truncate rounded-sm border border-input bg-surface px-2 text-sm text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 sm:max-w-40"
      >
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
      {failed ? (
        <span role="alert" className="text-xs text-danger">
          {failed}
        </span>
      ) : null}
    </div>
  );
}
