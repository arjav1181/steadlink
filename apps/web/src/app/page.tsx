import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">GoLink</h1>
        <p className="mt-2 text-sm text-muted">Self-hosted link management.</p>
        <Link
          href="/design"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground"
        >
          Design system
        </Link>
      </div>
    </main>
  );
}
