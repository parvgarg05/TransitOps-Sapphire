/**
 * FilterBar Component
 * 
 * Provides filtering controls for the dashboard:
 * - Vehicle Type filter
 * - Status filter
 * - Region filter
 * 
 * Requirements: 10.5, 10.6
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export interface DashboardFilters {
  vehicleType?: string;
  status?: string;
  region?: string;
}

interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  vehicleTypes: string[];
  statuses: string[];
  regions: string[];
}

export function FilterBar({
  filters,
  onFiltersChange,
  vehicleTypes,
  statuses,
  regions,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.vehicleType || filters.status || filters.region;

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const handleFilterChange = (key: keyof DashboardFilters, value: string | null) => {
    onFiltersChange({
      ...filters,
      [key]: !value || value === "all" ? undefined : value,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          {/* Vehicle Type Filter */}
          <div className="flex-1 min-w-[150px] max-w-[200px]">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              Vehicle Type
            </label>
            <Select
              value={filters.vehicleType || "all"}
              onValueChange={(value) => handleFilterChange("vehicleType", value)}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {vehicleTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-[150px] max-w-[200px]">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              Status
            </label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region Filter */}
          <div className="flex-1 min-w-[150px] max-w-[200px]">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
              Region
            </label>
            <Select
              value={filters.region || "all"}
              onValueChange={(value) => handleFilterChange("region", value)}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="whitespace-nowrap"
          >
            <X className="h-3 w-3 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-gray-600 dark:text-gray-400">
              Active filters:
            </span>
            {filters.vehicleType && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                Type: {filters.vehicleType}
              </span>
            )}
            {filters.status && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                Status: {filters.status}
              </span>
            )}
            {filters.region && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                Region: {filters.region}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
