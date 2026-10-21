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
            <span className="text-lg font-bold text-foreground">GoLink</span>
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
