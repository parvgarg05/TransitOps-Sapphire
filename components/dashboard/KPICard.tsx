/**
 * KPICard Component
 *
 * Displays an individual KPI metric on the dashboard using the design system's
 * feature-card treatment (light-gray surface, hairline, generous padding).
 * Handles N/A and loading cases.
 *
 * Requirements: 10.1, 10.9
 */

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number | string | null;
  unit?: string;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  isLoading?: boolean;
}

export function KPICard({
  title,
  value,
  unit,
  icon: Icon,
  description,
  trend,
  isLoading = false,
}: KPICardProps) {
  const isEmpty = value === null || value === "N/A";

  return (
    <div className="rounded-lg border border-hairline bg-surface-card p-5 transition-shadow hover:shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-canvas border border-hairline text-foreground">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-surface-strong" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-3xl font-semibold tracking-[-0.02em]",
                isEmpty ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {isEmpty
                ? "N/A"
                : typeof value === "number"
                  ? value.toLocaleString()
                  : value}
            </span>
            {unit && !isEmpty && (
              <span className="text-sm text-muted-foreground">{unit}</span>
            )}
          </div>
        )}

        {description && !isLoading && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}

        {trend && !isLoading && (
          <div
            className={cn(
              "mt-1 text-xs font-medium",
              trend.direction === "up" ? "text-success" : "text-error"
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
          </div>
        )}
      </div>
    </div>
  );
}
