import Link from "next/link";

export const metadata = {
  title: "Terms — Steadlink",
  description:
    "The terms of running the self-hosted Steadlink short link service, and the limits of the warranty and liability that come with it.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-gutter py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-sm text-muted">Legal</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Terms
        </h1>
        <p className="mt-4 text-sm text-muted">Last updated 2026-10-24.</p>

        <div className="mt-8 space-y-8 text-base leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">The offer</h2>
            <p className="text-muted">
              Steadlink is released under the MIT license. You may use it, copy it, change it and
              run it, for any purpose the law allows. You run the deployment, you keep the domain,
              you hold the database, you send the email. Steadlink provides the software; it does
              not provide a service, an SLA or a support entitlement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Your responsibilities</h2>
            <p className="text-muted">
              As the operator, you are responsible for the machine the deployment runs on, the
              database, the authentication secret, the reverse proxy and the TLS certificates, the
              domain the links point at, and the email configuration. You are responsible for the
              redirects the software makes — you point a link somewhere, and you should point it
              somewhere you have the right to point it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Acceptable use</h2>
            <p className="text-muted">
              You may not use Steadlink to distribute unlawful content, to send spam, or in any way
              that infringes the rights of the destination or of the people clicking. The audience is
              yours, and the responsibility for what the links point at is yours.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Warranty and liability</h2>
            <p className="text-muted">
              The software is provided as is and without warranty. There is no uptime commitment, no
              data-loss guarantee, and no liability beyond what the MIT license permits. You run it
              on hardware you control and you accept that risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Ending and changing these terms</h2>
            <p className="text-muted">
              You may stop, delete or modify the deployment at any time. These terms may change; a
              running deployment is yours, and you are responsible for the version you run.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-muted">
          The data the running deployment keeps is covered by the{" "}
          <Link href="/privacy" className="font-semibold text-foreground hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
