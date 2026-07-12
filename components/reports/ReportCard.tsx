/**
 * ReportCard Component
 * 
 * Displays an individual analytics report with metric name, value, and unit.
 * Handles N/A cases with clear messaging.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportCardProps {
  title: string;
  value: number | null | string;
  unit?: string;
  description?: string;
  isLoading?: boolean;
}

export function ReportCard({
  title,
  value,
  unit,
  description,
  isLoading = false,
}: ReportCardProps) {
  // Format value display
  const displayValue = () => {
    if (isLoading) {
      return (
        <span className="text-3xl font-bold text-gray-400">Loading...</span>
      );
    }

    if (value === null || value === "N/A") {
      return (
        <span className="text-3xl font-bold text-gray-400">N/A</span>
      );
    }

    return (
      <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {typeof value === "number" ? value.toFixed(2) : value}
        {unit && <span className="text-lg text-gray-600 dark:text-gray-400 ml-2">{unit}</span>}
      </span>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayValue()}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
