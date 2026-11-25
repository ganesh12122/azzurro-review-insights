import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Azzurro Review Insights",
  description:
    "Booking.com review insights for Azzurro Hotels operations — Sydney pod stays, free dinner, guest sentiment.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full text-azzurro-ink">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
