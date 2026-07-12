/**
 * Top header for the authenticated app shell.
 *
 * Shows the mobile menu toggle, the signed-in user's email + role badge,
 * and a logout action wired to NextAuth signOut.
 */

"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Menu, LogOut } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-canvas border-b border-hairline">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-surface-card"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {session?.user && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {session.user.email}
            </span>
            {session.user.role && (
              <Badge variant="secondary" className="text-xs">
                {session.user.role}
              </Badge>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="gap-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
