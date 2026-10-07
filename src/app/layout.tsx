import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Co.Stack — Minimal Infrastructure Stack Builder",
  description:
    "Deterministic step-based visual infrastructure stack builder. Search, connect, and deploy via verified bash scripts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-white dark:bg-black text-zinc-950 dark:text-zinc-50 font-sans">
        {children}
      </body>
    </html>
  );
}
