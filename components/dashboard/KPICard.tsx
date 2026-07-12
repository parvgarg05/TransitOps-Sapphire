/**
 * KPICard Component
 * 
 * Displays an individual KPI metric on the dashboard.
 * Handles N/A cases and different metric types.
 * 
 * Requirements: 10.1, 10.9
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

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
  // Format value display
  const displayValue = () => {
    if (isLoading) {
      return (
        <span className="text-2xl md:text-3xl font-bold text-gray-400">
          --
        </span>
      );
    }

    if (value === null || value === "N/A") {
      return (
        <span className="text-2xl md:text-3xl font-bold text-gray-400">
          N/A
        </span>
      );
    }

    return (
      <div className="flex items-baseline gap-2">
        <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {unit}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {displayValue()}
          {description && !isLoading && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
          {trend && !isLoading && (
            <div
              className={`text-xs font-medium ${
                trend.direction === "up"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
