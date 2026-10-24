import { Badge, Button, Card } from "@steadlink/ui";
import { ArrowRight, BarChart3, Globe, QrCode, Sparkles } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Steadlink — short links, QR codes and analytics you own",
  description:
    "A self-hosted link manager: branded short links, QR codes, landing pages, and click analytics.",
};

const FEATURES = [
  {
    icon: Globe,
    title: "Links on your own domain",
    body: "Point a domain you own at Steadlink. Every short link on it carries your name, and the domain is yours to move.",
  },
  {
    icon: QrCode,
    title: "QR codes for anything",
    body: "Print a code for a poster, a package or a table card. Restyle it later; the code on the sheet does not change.",
  },
  {
    icon: BarChart3,
    title: "Clicks you can act on",
    body: "See where the click came from, on which device, from which country, and when. The history stays as long as the link does.",
  },
  {
    icon: Sparkles,
    title: "Pages and campaigns",
    body: "Group links into a campaign, compare the channels, and put a link-in-bio page in front of it.",
  },
];

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-content items-center gap-4 px-gutter py-4">
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
              <rect width="32" height="32" rx="7" fill="var(--color-accent)" />
              <circle
                cx="16"
                cy="12.6"
                r="6"
                fill="none"
                stroke="var(--color-accent-foreground)"
                strokeWidth="3.2"
              />
              <rect
                x="6"
                y="20.6"
                width="20"
                height="3.4"
                rx="1.7"
                fill="var(--color-accent-foreground)"
              />
            </svg>
            <span className="text-lg font-bold text-foreground">Steadlink</span>
          </span>
          <nav aria-label="Primary" className="ml-8 hidden gap-6 sm:flex">
            <a href="#features" className="text-sm text-muted hover:text-foreground">
              Features
            </a>
            <a href="#how" className="text-sm text-muted hover:text-foreground">
              How it works
            </a>
            <a href="#self-host" className="text-sm text-muted hover:text-foreground">
              Self-hosting
            </a>
            <Link href="/check" className="text-sm text-muted hover:text-foreground">
              Check a link
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-content px-gutter py-20">
          <div className="max-w-2xl">
            <Badge tone="neutral">Your domain. Your data. Your links.</Badge>
            <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight text-foreground sm:text-5xl">
              The link you printed still works.
            </h1>
            <p className="mt-5 text-lg text-muted">
              Steadlink puts short links and QR codes on a domain you own. The click goes straight
              to the destination - no page in between, no ad, no countdown - and the numbers are
              yours to keep.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Make a link
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/check">Check a link</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted">
              Your own database, your own server. No per-click meter.
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-content px-gutter py-20">
            <h2 className="text-3xl font-bold text-foreground">What it does</h2>
            <p className="mt-2 max-w-2xl text-muted">
              Four things, done properly, rather than forty done thinly.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="p-6">
                    <Icon aria-hidden="true" className="size-5 text-accent" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-1.5 text-sm text-muted">{feature.body}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-content px-gutter py-20">
          <h2 className="text-3xl font-bold text-foreground">How it works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Make a link",
                body: "Paste a URL, pick a back-half, or let one be generated. It is live in a second.",
              },
              {
                step: "02",
                title: "Share it anywhere",
                body: "Post it, print it as a QR code, or drop it into a landing page you build.",
              },
              {
                step: "03",
                title: "Read the numbers",
                body: "Clicks, scans, referrers, devices and places, in one dashboard.",
              },
            ].map((item) => (
              <li key={item.step}>
                <span className="font-mono text-sm text-muted">{item.step}</span>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Self-hosting */}
        <section id="self-host" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-content px-gutter py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold text-foreground">Run it yourself</h2>
                <p className="mt-3 text-muted">
                  One command, one database, one domain. The redirect path is a small service that
                  answers in milliseconds and writes the click in the background.
                </p>
                <pre className="mt-6 overflow-x-auto rounded-lg bg-accent p-4 text-sm text-accent-foreground">
                  <code>docker compose up -d</code>
                </pre>
              </div>
              <ul className="space-y-3">
                {[
                  "Postgres for everything, with row-level security per workspace",
                  "A v4-compatible REST API and signed webhooks",
                  "QR codes rendered as SVG or PNG, with your own colours and logo",
                  "Your data stays on your machine. Nothing leaves it.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 text-sm text-foreground">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-pill bg-accent"
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-content flex-wrap items-center gap-4 px-gutter py-6 text-sm text-muted">
          <span className="font-semibold text-foreground">Steadlink</span>
          <span>Your links, on your own domain.</span>
          <div className="ml-auto flex gap-4">
            <Link href="/check" className="hover:text-foreground">
              Check a link
            </Link>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/sign-up" className="hover:text-foreground">
              Create the workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
