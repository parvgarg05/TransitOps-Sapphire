/**
 * Shared page header — Cal.com display voice (Inter 600, negative tracking)
 * with an optional muted subtitle and a right-aligned action slot.
 */

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8",
        className
      )}
    >
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
