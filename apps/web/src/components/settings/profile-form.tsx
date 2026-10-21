"use client";

import { Button, Field, TextInput } from "@golink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { updateProfileAction } from "@/app/settings-actions";

export function ProfileForm({
  displayName: initialName,
  timezone: initialZone,
  orgName,
  email,
}: {
  displayName: string;
  timezone: string;
  orgName: string;
  email: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState(initialName);
  const [timezone, setTimezone] = React.useState(initialZone);
  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await updateProfileAction({ displayName, timezone });
    setBusy(false);
    setSaved(result.ok);
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label="Your name" htmlFor="profile-name" required>
        <TextInput
          id="profile-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </Field>
      <Field label="Email" htmlFor="profile-email" hint="Only an owner can change this.">
        <TextInput id="profile-email" value={email} readOnly disabled />
      </Field>
      <Field
        label="Reporting time zone"
        htmlFor="profile-zone"
        hint="Daily totals are counted in this zone, not in UTC."
      >
        <TextInput
          id="profile-zone"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          placeholder="Europe/Berlin"
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={busy}>
          Save changes
        </Button>
        {saved ? (
          <p role="status" className="text-sm text-success">
            Saved.
          </p>
        ) : null}
      </div>
      <p className="text-sm text-muted">
        Workspace: <span className="text-foreground">{orgName}</span>
      </p>
    </form>
  );
}
