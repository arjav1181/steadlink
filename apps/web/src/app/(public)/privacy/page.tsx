import Link from "next/link";

export const metadata = {
  title: "Privacy — Steadlink",
  description:
    "What Steadlink keeps when you self-host it, where the data lives, how long it is kept, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-gutter py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-sm text-muted">Legal</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Privacy
        </h1>
        <p className="mt-4 text-sm text-muted">Last updated 2026-10-24.</p>

        <div className="mt-8 space-y-8 text-base leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">The short version</h2>
            <p className="text-muted">
              Steadlink is a short link service you run yourself. That is the whole privacy story.
              When you self-host there is no Steadlink server holding your links, your numbers or
              your people — the deployment you run is yours, and the operator of it is the one who
              decides what the data is for and who it is about.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">What the software keeps</h2>
            <p className="text-muted">
              An account — the name and email address you signed up with. The links you make: the
              destination, the back-half, the title and tags, the expiry and the state. The click
              history that goes with them: the time, the destination, the device, the country, and
              the IP address of the click for as long as the history is kept. The designs you make
              for QR codes. Session state lives in the same place.
            </p>
            <p className="text-muted">
              Nothing else. The application ships no telemetry, no phone-home, no third-party
              analytics, and no advertising or retargeting code. The only things that touch a network
              are the redirect itself, and — when you configure one — your own email provider for
              sign-in links and alerts. There is no Steadlink-side copy of your workspace, because
              there is no Steadlink-side server to hold one.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Where the data lives</h2>
            <p className="text-muted">
              In your own PostgreSQL database, on the machine you run the deployment on. The email
              for sign-in links and alerts goes to the SMTP provider you configure; without one, the
              outbox is the log file on your own server. TLS certificates come from your own reverse
              proxy. Backups are yours to take and to keep.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">How long it is kept</h2>
            <p className="text-muted">
              The click history stays for as long as the link does, and goes when the link does.
              Deleting a link deletes its history; deleting the account deletes the workspace
              data. You can export the whole workspace as a CSV before you delete anything, and you
              should — it is one button away.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Cookies</h2>
            <p className="text-muted">
              One session cookie, for the session itself. No analytics, advertising or social
              tracking cookies are set by the application. Any cookies your own reverse proxy sets
              for its own purposes are yours to read.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Third parties</h2>
            <p className="text-muted">
              No third party receives your data beyond the infrastructure you run and the email
              provider you configure. There is no analytics account, no support desk holding
              transcripts, no resale. The product you deploy is the product.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Your rights</h2>
            <p className="text-muted">
              As the operator of the deployment, you can export the data, delete links and delete
              the account. The people clicking your links are your audience and your data; the
              deployment is yours to handle.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Changes and contact</h2>
            <p className="text-muted">
              This page may be updated. A running deployment is yours, and you are responsible for
              the version you run.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-muted">
          The software is free and MIT-licensed. The terms of running it are in the{" "}
          <Link href="/terms" className="font-semibold text-foreground hover:underline">
            terms
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
