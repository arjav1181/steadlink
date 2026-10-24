import Link from "next/link";
import type { ReactNode } from "react";

const SECTIONS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/usage", label: "Usage" },
  { href: "/settings/users", label: "People and groups" },
  { href: "/domains", label: "Custom domains" },
  { href: "/settings/webhooks", label: "Webhooks" },
  { href: "/settings/api", label: "API" },
  { href: "/settings/activity", label: "Activity" },
  { href: "/settings/bulk", label: "Bulk uploads" },
  { href: "/settings/deeplinks", label: "Mobile deep links" },
  { href: "/settings/ai", label: "Assistant" },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Settings sections">
        <ul className="space-y-0.5">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="block rounded-sm px-3 py-2 text-sm text-muted transition-colors duration-100 hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
