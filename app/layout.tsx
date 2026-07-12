import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
