import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-gutter py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
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
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="hidden bg-accent lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        <blockquote className="max-w-md px-12">
          <p className="text-2xl leading-snug font-semibold text-accent-foreground">
            One place for every link you share, and the numbers that tell you which ones worked.
          </p>
          <p className="mt-4 text-sm text-accent-foreground/70">
            Short links with your own domain, QR codes for print, landing pages, and analytics that
            do not need a spreadsheet.
          </p>
        </blockquote>
      </div>
    </div>
  );
}
