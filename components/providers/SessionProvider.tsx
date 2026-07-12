/**
 * Session Provider Component
 * 
 * Client-side wrapper for NextAuth SessionProvider.
 * This allows client components to access session data using useSession hook.
 * 
 * Requirements: 1.1
 */

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { Session } from "next-auth";

interface SessionProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

/**
 * Wraps the application with NextAuth's SessionProvider
 * 
 * Usage in layout.tsx:
 * ```tsx
 * import { SessionProvider } from "@/components/providers/SessionProvider";
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SessionProvider>{children}</SessionProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 * 
 * Requirement 1.1: Authentication infrastructure
 */
export function SessionProvider({ children, session }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
