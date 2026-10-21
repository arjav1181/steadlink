import { getProfile } from "@golink/data";

import { Card } from "@golink/ui";

import { ProfileForm } from "@/components/settings/profile-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await import("@golink/data").then((module) => module.getCtx());
  const profile = await getProfile(ctx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted">
          Your name, your workspace, and the time zone your reports are counted in.
        </p>
      </div>

      <Card className="p-6">
        <ProfileForm
          displayName={profile.user?.displayName ?? ""}
          timezone={profile.org?.timezone ?? "UTC"}
          orgName={profile.org?.name ?? ""}
          email={profile.user?.email ?? ""}
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Workspace</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">Name</dt>
            <dd className="text-foreground">{profile.org?.name}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">Address</dt>
            <dd className="text-foreground">{profile.user?.email}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">Reporting time zone</dt>
            <dd className="text-foreground">{profile.org?.timezone}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
