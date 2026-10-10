import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VetTravel Verify",
  description: "Source-backed travel planning for veterinarians.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring">
          Skip to content
        </a>
        <header className="no-print border-b">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3" aria-label="Main">
            <Link href="/" className="font-semibold tracking-tight">
              VetTravel Verify
            </Link>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/case/trip" className="hover:text-foreground">
                New case
              </Link>
              <Link href="/kb" className="hover:text-foreground">
                Knowledge base
              </Link>
            </div>
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="no-print border-t">
          <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted-foreground">
            Decision support for licensed veterinarians. Not a government approval. Requirements can change; final clearance rests with the
            relevant authorities and the veterinarian&apos;s professional judgment.
          </p>
        </footer>
      </body>
    </html>
  );
}
