/**
 * Login Page
 *
 * Credentials login wired to NextAuth. On success, redirects to the originally
 * requested page (via ?redirect=) or the dashboard. Displays a generic error on
 * failure and surfaces session-expiry / lockout messaging.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.5
 */

"use client";

import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { roleHome } from "@/lib/roleAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // An explicit ?redirect= (e.g. from a deep link) is honored; otherwise we
  // send the user to their role's home page.
  const explicitRedirect = searchParams.get("redirect");
  const expired = searchParams.get("expired") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.ok) {
        // Resolve the freshly-issued session to route by role.
        const session = await getSession();
        const destination =
          explicitRedirect || roleHome(session?.user?.role);
        router.push(destination);
        router.refresh();
      }
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-soft px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground mb-3">
            <Truck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">TransitOps</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your operations account
          </p>
        </div>

        <div className="bg-canvas border border-hairline rounded-xl shadow-card p-8">
          {expired && !error && (
            <div className="mb-4 rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
              Your session expired due to inactivity. Please sign in again.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md bg-error/10 border border-error/30 px-3 py-2 text-sm text-error"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={128}
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          TransitOps — Smart Transport Operations Platform
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
