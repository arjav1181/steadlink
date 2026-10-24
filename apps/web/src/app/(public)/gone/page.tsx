import { Archive, Clock, FileQuestion } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "This link is not available — Steadlink" };
export const dynamic = "force-dynamic";

const REASONS = {
  expired: {
    icon: Clock,
    title: "This link has expired",
    body: "The person who made it set a time limit, and that limit has passed. Ask them for a new one.",
  },
  archived: {
    icon: Archive,
    title: "This link is no longer active",
    body: "It was retired by the person who made it. The destination may still be where you want to go.",
  },
  missing: {
    icon: FileQuestion,
    title: "We cannot find that link",
    body: "The address may have a typo in it, or the link was never created. Check the last few characters and try again.",
  },
} as const;

export default async function GonePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const key = (reason && reason in REASONS ? reason : "missing") as keyof typeof REASONS;
  const copy = REASONS[key];
  const Icon = copy.icon;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-gutter">
      <div className="w-full max-w-md rounded-lg bg-surface p-8 text-center shadow-card">
        <span className="mx-auto flex size-12 items-center justify-center rounded-pill bg-surface-2">
          <Icon aria-hidden="true" className="size-5 text-muted" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted">{copy.body}</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
