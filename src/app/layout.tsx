import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jobs to Close admin",
  description:
    "Admin for Jobs to Close's embeddable chat intake widget. Manage businesses, flows, and leads.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  );
}
