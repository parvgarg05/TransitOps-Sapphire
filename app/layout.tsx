import type { Metadata } from 'next'
import './globals.css'
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeScript } from "@/components/layout/ThemeToggle";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'TransitOps - Smart Transport Operations Platform',
  description: 'Centralized transport operations management for vehicles, drivers, trips, and maintenance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
