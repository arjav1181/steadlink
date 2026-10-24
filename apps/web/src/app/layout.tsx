import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@steadlink/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steadlink",
  description:
    "Short links and QR codes on your own domain, with nothing between the click and the destination.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
