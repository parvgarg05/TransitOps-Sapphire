/**
 * ReportCard Component
 * 
 * Displays an individual analytics report with metric name, value, and unit.
 * Handles N/A cases with clear messaging.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  title: string;
  value: number | null | string;
  unit?: string;
  description?: string;
  isLoading?: boolean;
  className?: string;
}

export function ReportCard({
  title,
  value,
  unit,
  description,
  isLoading = false,
  className,
}: ReportCardProps) {
  // Format value display
  const displayValue = () => {
    if (isLoading) {
      return (
        <span className="text-3xl font-bold text-muted-foreground">Loading...</span>
      );
    }

    if (value === null || value === "N/A") {
      return (
        <span className="text-3xl font-bold text-muted-foreground">N/A</span>
      );
    }

    return (
      <span className="text-3xl font-bold text-foreground dark:text-gray-100">
        {typeof value === "number" ? value.toFixed(2) : value}
        {unit && <span className="text-lg text-muted-foreground dark:text-muted-foreground ml-2">{unit}</span>}
      </span>
    );
  };

  return (
    <Card className={cn("ring-0 shadow-sm hover:shadow-md transition-shadow [--card-spacing:--spacing(6)]", className)}>
      <CardHeader className="px-6 pt-6 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <div className="space-y-3">
          {displayValue()}
          {description && (
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
