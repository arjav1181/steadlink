import { Badge, Button, Card } from "@steadlink/ui";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Steadlink — short links, QR codes and analytics you own",
  description:
    "Self-hosted short links and QR codes on a domain you own, with nothing between the click and the destination. Free and MIT-licensed.",
};

/** The four things the page leads with: what the evidence says is broken. */
const FEATURES = [
  {
    title: "A redirect that is only a redirect",
    body: "No page, no countdown, no ad, on any link. The response is the redirect, and the click is written behind it.",
  },
  {
    title: "Your own domain",
    body: "Every link carries a domain you own. If you move servers, the domain moves with you and the links keep working.",
  },
  {
    title: "A history that is never cut short",
    body: "The events are kept for as long as the link exists. There is no thirty-day window, and no upgrade that unlocks last year.",
  },
  {
    title: "Every link, as a spreadsheet",
    body: "The workspace exports to CSV — short link, destination, title, clicks, created, state — from a button, not a support ticket.",
  },
  {
    title: "Your server, your database",
    body: "Run it on a machine you control. The data is in your Postgres, the backups are yours, and nobody else can read it.",
  },
  {
    title: "An API with a key you can revoke",
    body: "Scoped API tokens and signed webhooks, for the things you would rather automate than click.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Point a domain at it",
    body: "Add the domain you already own, or one you buy for this. Every link made afterwards carries it.",
  },
  {
    step: "02",
    title: "Make the link, or print the code",
    body: "Pick the back half yourself, or let one be generated. A QR code can be restyled later without changing what is printed.",
  },
  {
    step: "03",
    title: "Read the clicks",
    body: "Where they came from, which device, which country, and when. The history stays for as long as the link does.",
  },
];

const COSTS = [
  ["A server", "$5–$12 a month", "2 vCPU, 2 GB of RAM and 40 GB of disk is enough for a small workspace."],
  ["A domain", "$10–$15 a year", "The short domain. It is yours, and it moves with you."],
  ["PostgreSQL", "$0", "Runs beside the app in the compose file."],
  ["TLS", "$0", "Let's Encrypt, through the reverse proxy."],
  ["Email (optional)", "$0–$10 a month", "Sign-in links and alerts. A free relay covers a small workspace."],
];

const FAQ = [
  {
    q: "Does anything appear between the click and the destination?",
    a: "No. The answer is a redirect, on every link, and the end-to-end suite asserts it on every run. There is no ad inventory in the product to sell.",
  },
  {
    q: "What does it cost?",
    a: "The software is free and MIT-licensed. You pay for the server and the domain, which is about $6–$15 a month, and nothing per click.",
  },
  {
    q: "Can I import from the shortener I use now?",
    a: "Not yet. The export is a CSV of every link with its destination, and an import is the next thing on the list. Until then, the export is still the way out.",
  },
  {
    q: "What happens to my links if this project stops?",
    a: "Nothing. The code is MIT, the database is yours, and the domain is yours. A CSV of every link is one button away, and the links keep resolving for as long as the server runs.",
  },
  {
    q: "Is there a limit on links or clicks?",
    a: "No. The counts on the dashboard are counts; nothing enforces a ceiling and there is nothing to buy. The only limit is the disk on the machine you run it on.",
  },
  {
    q: "Where does the data live?",
    a: "In your PostgreSQL database, on your server. There is no Steadlink server holding a copy, because there is no Steadlink server.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-content items-center px-gutter py-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Steadlink home">
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
          </Link>
          <nav aria-label="Primary" className="ml-8 hidden gap-6 sm:flex">
            <a href="#how" className="text-sm text-muted hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="text-sm text-muted hover:text-foreground">
              What it does
            </a>
            <a href="#cost" className="text-sm text-muted hover:text-foreground">
              What it costs
            </a>
            <a href="#faq" className="text-sm text-muted hover:text-foreground">
              Questions
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
        <section className="mx-auto max-w-content px-gutter pt-16 pb-14 sm:pt-20">
          <div className="max-w-2xl">
            <Badge tone="neutral">Your domain. Your data. Your links.</Badge>
            <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight text-foreground sm:text-5xl">
              The link you printed still works.
            </h1>
            <p className="mt-5 text-lg text-muted">
              Steadlink puts short links and QR codes on a domain you own. The click goes straight
              to the destination — no page in between, no ad, no countdown — and the numbers are
              yours to keep.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Make a link
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <span className="text-sm text-muted">Free to self-host. MIT. No meter.</span>
            </div>
          </div>

          <figure className="mt-12 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <img
              src="/steadlink-dashboard.png"
              alt="The Steadlink dashboard: links with their clicks, and a chart of the last thirty days."
              width={1440}
              height={900}
              className="h-auto w-full"
            />
          </figure>
        </section>

        {/* The problem */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-content px-gutter py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-foreground">
                A link is a promise with a date on it.
              </h2>
              <p className="mt-4 text-muted">
                The date is the day someone scans the card, opens the brochure or taps the poster.
                From that moment the link has to work, and it has to go where it said it would.
              </p>
            </div>
            <div className="mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Something appears before the destination
                </h3>
                <p className="mt-1.5 text-sm text-muted">
                  A preview, a countdown, an ad — a page that was not there when the code was
                  printed, inserted by the service after the printing. The click was promised to
                  one place and lands somewhere else for a few seconds first.
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground">The link stops working</h3>
                <p className="mt-1.5 text-sm text-muted">
                  Quietly, and without notice. The code is fine, the card is fine, and the person
                  holding it gets an error. You find out from them, weeks after it started.
                </p>
              </Card>
            </div>
            <p className="mt-8 max-w-3xl text-foreground">
              Both of those are choices the service makes. Steadlink makes the other one.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-content px-gutter py-20">
          <h2 className="text-3xl font-bold text-foreground">How it works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((item) => (
              <li key={item.step}>
                <span className="font-mono text-sm text-muted">{item.step}</span>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-content px-gutter py-20">
            <h2 className="text-3xl font-bold text-foreground">What is different here</h2>
            <p className="mt-2 max-w-2xl text-muted">
              A full link manager is the price of entry. These six are the part the market does
              not do.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="p-6">
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{feature.body}</p>
                </Card>
              ))}
            </div>
            <p className="mt-8 max-w-3xl text-sm text-muted">
              Also in the box: QR codes with your own colours and logo, link-in-bio pages,
              campaigns with channels, deep links, bulk actions up to 100 links, and groups for
              splitting one workspace into several.
            </p>
          </div>
        </section>

        {/* What it costs */}
        <section id="cost" className="mx-auto max-w-content px-gutter py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-3xl font-bold text-foreground">What it costs</h2>
              <p className="mt-4 text-muted">
                Steadlink is MIT-licensed and self-hosted. There is no plan, no seat count, no
                trial and no per-click charge. What you pay for is the machine it runs on.
              </p>
              <p className="mt-4 text-muted">
                For comparison, the going rate for a hosted shortener is $10 to $48 a month,
                metered on links created or clicks tracked, with the entry tier holding thirty
                days of history. Here there is nothing to meter.
              </p>
              <div className="mt-6">
                <Button variant="secondary" asChild>
                  <Link href="/docs">Read the setup guide</Link>
                </Button>
              </div>
            </div>
            <table className="w-full text-sm">
              <caption className="sr-only">The cost of running Steadlink on your own server</caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-4 font-semibold text-foreground">
                    Line
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-foreground">
                    Typical
                  </th>
                  <th scope="col" className="py-2 font-semibold text-foreground">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {COSTS.map(([line, price, note]) => (
                  <tr key={line} className="border-b border-border align-top">
                    <td className="py-2.5 pr-4 text-foreground">{line}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-foreground">{price}</td>
                    <td className="py-2.5 text-muted">{note}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 pr-4 font-semibold text-foreground">Total</td>
                  <td className="py-3 pr-4 font-semibold whitespace-nowrap text-foreground">
                    $6–$15 / month
                  </td>
                  <td className="py-3 text-muted">And nothing per click.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-content px-gutter py-20">
            <h2 className="text-3xl font-bold text-foreground">Questions</h2>
            <div className="mt-8 max-w-3xl divide-y divide-border border-y border-border">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-medium text-foreground">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="mt-0.5 text-lg leading-none text-muted group-open:hidden"
                    >
                      +
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 hidden text-lg leading-none text-muted group-open:inline"
                    >
                      −
                    </span>
                  </summary>
                  <p className="mt-2 max-w-2xl text-sm text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-content px-gutter py-20 text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Put a link on something you cannot take back.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              The card, the poster, the packaging. It should still work when the campaign is over
              and the invoice is paid.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  Make a link
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
              <span className="text-sm text-muted">
                Free to self-host. Nothing between the click and the destination.
              </span>
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
            <Link href="/docs" className="hover:text-foreground">
              Docs
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
