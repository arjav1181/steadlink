import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@golink/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoLink",
  description: "Self-hosted link management, QR codes, pages and analytics.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
