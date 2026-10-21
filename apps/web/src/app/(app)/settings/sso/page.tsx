import { Card, PlanGate } from "@golink/ui";

export const dynamic = "force-dynamic";

export default function SsoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Single sign-on</h1>
        <p className="mt-1 text-sm text-muted">
          Let your identity provider handle sign-in, instead of passwords.
        </p>
      </div>

      <PlanGate
        reason="Single sign-on is not enabled for this workspace."
        action={
          <a
            href="https://www.better-auth.com/docs/plugins/sso"
            className="text-sm font-semibold text-accent hover:underline"
            rel="noreferrer noopener"
            target="_blank"
          >
            Read how it works
          </a>
        }
      />

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">What you would need</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>A SAML 2.0 identity provider, such as Okta, Entra ID or Keycloak.</li>
          <li>The metadata URL for your identity provider.</li>
          <li>An attribute mapping from the provider onto your user record.</li>
        </ul>
      </Card>
    </div>
  );
}
