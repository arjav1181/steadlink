"use client";

import { Button, IconButton } from "@golink/ui";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  Globe,
  HelpCircle,
  Home,
  Link2,
  type LucideIcon,
  QrCode,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { useAccount } from "./account-provider";
import { GroupSwitcher } from "./group-switcher";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/links", label: "Links", icon: Link2 },
  { href: "/qr", label: "QR codes", icon: QrCode },
  { href: "/pages", label: "Pages", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/campaigns", label: "Campaigns", icon: Folder },
  { href: "/channels", label: "Channels", icon: Globe },
  { href: "/settings/users", label: "People", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, _setCollapsed] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const { user, org, group, groups } = useAccount();

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const rail = (
    <div
      className="flex h-full flex-col items-center gap-1 border-r border-border bg-surface py-4"
      style={{ width: collapsed ? 64 : 64 }}
    >
      <Link
        href="/dashboard"
        aria-label="GoLink home"
        className="mb-2 flex size-10 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="var(--color-accent)" />
          <path
            d="M11 20.5 20.5 11"
            stroke="var(--color-accent-foreground)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle
            cx="11.5"
            cy="11.5"
            r="3"
            fill="none"
            stroke="var(--color-accent-foreground)"
            strokeWidth="2.4"
          />
          <circle
            cx="20.5"
            cy="20.5"
            r="3"
            fill="none"
            stroke="var(--color-accent-foreground)"
            strokeWidth="2.4"
          />
        </svg>
      </Link>

      <Link
        href="/links?new=1"
        aria-label="Create a new link"
        className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground transition-colors duration-100 hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          viewBox="0 0 16 16"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
        </svg>
      </Link>

      <nav aria-label="Primary" className="mt-3 flex flex-1 flex-col items-center gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "relative flex size-11 items-center justify-center rounded-md transition-colors duration-100",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              ].join(" ")}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 -left-[9px] h-6 w-[3px] -translate-y-1/2 rounded-r-pill bg-accent"
                />
              ) : null}
              <Icon className="size-5" aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1">
        <Link
          href="/settings"
          aria-label="Settings"
          className={[
            "flex size-11 items-center justify-center rounded-md transition-colors duration-100",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            pathname.startsWith("/settings")
              ? "bg-accent-soft text-accent"
              : "text-muted hover:bg-surface-2 hover:text-foreground",
          ].join(" ")}
        >
          <Settings className="size-5" aria-hidden="true" />
        </Link>
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-pill bg-accent-soft text-xs font-semibold text-accent"
        >
          {(user?.name ?? "?").slice(0, 2).toUpperCase()}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex">
        {/* Desktop rail */}
        <div className="hidden shrink-0 lg:block">
          <div className="sticky top-0 h-screen">{rail}</div>
        </div>

        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-gutter">
            <IconButton
              label={drawerOpen ? "Close navigation" : "Open navigation"}
              className="lg:hidden"
              onClick={() => setDrawerOpen((open) => !open)}
              icon={
                drawerOpen ? (
                  <ChevronLeft aria-hidden="true" className="size-4" />
                ) : (
                  <ChevronRight aria-hidden="true" className="size-4" />
                )
              }
            />

            <search className="min-w-0 flex-1 max-w-md">
              <form onSubmit={submitSearch}>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                  />
                  <label htmlFor="global-search" className="sr-only">
                    Search links and QR codes
                  </label>
                  <input
                    id="global-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search links and codes"
                    className="h-9 w-full rounded-md border border-input bg-surface-2 pr-3 pl-9 text-sm text-foreground placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  />
                </div>
              </form>
            </search>

            <div className="ml-auto flex items-center gap-1">
              <IconButton
                label="Help"
                icon={<HelpCircle aria-hidden="true" className="size-4" />}
                onClick={() => router.push("/settings")}
              />
              <IconButton
                label="Ask about your data"
                variant="ai"
                icon={<Sparkles aria-hidden="true" className="size-4" />}
                onClick={() => router.push("/analytics?assistant=1")}
              />
              <div className="ml-2 hidden items-center gap-3 md:flex">
                <GroupSwitcher groups={groups} active={group} />
                <span className="text-sm font-medium text-foreground">{org?.name ?? ""}</span>
              </div>
            </div>
          </header>

          <main id="main" className="mx-auto max-w-content px-gutter py-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-[rgba(16,24,40,.45)]"
          />
          <div className="absolute inset-y-0 left-0 w-rail">{rail}</div>
        </div>
      ) : null}
    </div>
  );
}

/** The persistent assistant panel. */
export function AssistantPanel({
  open,
  onClose,
  suggestions,
}: {
  open: boolean;
  onClose: () => void;
  suggestions: string[];
}) {
  const [messages, setMessages] = React.useState<
    { id: string; role: "you" | "golink"; text: string }[]
  >([]);
  const [draft, setDraft] = React.useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { id: `m${current.length}-you`, role: "you", text: trimmed },
      {
        id: `m${current.length}-golink`,
        role: "golink",
        text: "The assistant is not wired to a model yet. Connect one in Settings, or browse the dashboard for the same numbers.",
      },
    ]);
    setDraft("");
  }

  if (!open) return null;

  return (
    <aside
      aria-label="Assistant"
      className="fixed inset-y-0 right-0 z-40 flex w-[380px] max-w-[92vw] flex-col border-l border-border bg-surface shadow-pop"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Sparkles aria-hidden="true" className="size-4 text-ai" />
          Ask about your data
        </h2>
        <IconButton
          label="Close the assistant"
          onClick={onClose}
          icon={<span aria-hidden="true">×</span>}
        />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Ask about clicks, scans, referrers or locations. The assistant reads the same numbers
              you see on the dashboard.
            </p>
            <ul className="space-y-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <Button
                    variant="secondary"
                    className="h-auto w-full justify-start py-2 text-left text-sm"
                    onClick={() => send(suggestion)}
                  >
                    {suggestion}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <p
              key={message.id}
              className={[
                "max-w-[34ch] rounded-lg px-3 py-2 text-sm",
                message.role === "you"
                  ? "ml-auto bg-accent text-accent-foreground"
                  : "bg-surface-2 text-foreground",
              ].join(" ")}
            >
              {message.text}
            </p>
          ))
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className="border-t border-border p-4"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Ask a question about your data
        </label>
        <div className="flex gap-2">
          <input
            id="assistant-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Which sources drove the most clicks?"
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-surface px-3 text-sm text-foreground placeholder:text-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <Button type="submit" disabled={!draft.trim()}>
            Send
          </Button>
        </div>
      </form>
    </aside>
  );
}
