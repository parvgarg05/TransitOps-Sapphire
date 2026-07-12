/**
 * Lightweight toast system (no extra dependencies — uses framer-motion, which
 * is already installed).
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast({ title: "Saved", description: "Vehicle created", variant: "success" });
 *
 * Wrap the app once in <ToastProvider> (done in the root layout).
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms (default 4000). */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, "duration">> {
  id: number;
  duration: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

const VARIANT_STYLE: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; accent: string }
> = {
  success: { icon: CheckCircle2, accent: "text-success" },
  error: { icon: AlertCircle, accent: "text-error" },
  info: { icon: Info, accent: "text-foreground" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description = "", variant = "info", duration = 4000 }: ToastOptions) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, title, description, variant, duration }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast viewport — bottom-right, above everything else. */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[10000] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { icon: Icon, accent } = VARIANT_STYLE[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="pointer-events-auto flex items-start gap-3 rounded-lg border border-hairline bg-canvas p-3 shadow-elevated"
                role="status"
              >
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", accent)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-surface-card hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
