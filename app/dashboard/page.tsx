/**
 * Dashboard Page
 * 
 * Main operations dashboard displaying role-appropriate KPIs with filtering.
 * 
 * Features:
 * - Role-based default KPI views (Fleet Manager, Driver, Safety Officer, Financial Analyst)
 * - Toggle to show full KPI set
 * - Apply filters: vehicleType, status, region
 * - Responsive grid layout (360px - 1920px)
 * - Handle N/A cases (Fleet Utilization when no non-Retired vehicles)
 * 
 * Requirements: 10.1, 10.5, 10.6, 10.9, 10.10, 10.11, 10.12, 10.13, 10.14
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/KPICard";
import { FilterBar, DashboardFilters } from "@/components/dashboard/FilterBar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Car,
  Users,
  Route,
  Wrench,
  TrendingUp,
  AlertTriangle,
  Shield,
  DollarSign,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface KPIData {
  "Active Vehicles"?: number;
  "Available Vehicles"?: number;
  "Vehicles in Maintenance"?: number;
  "Active Trips"?: number;
  "Pending Trips"?: number;
  "Drivers On Duty"?: number;
  "Fleet Utilization"?: number | null;
  "Available Drivers Count"?: number;
  "Expired License Count"?: number;
  "Soon-To-Expire License Count"?: number;
  "Suspended Drivers Count"?: number;
  "Safety Scores"?: Array<{
    driverId: string;
    driverName: string;
    score: number;
  }>;
  "Operational Cost"?: number | null;
  "Fuel Efficiency"?: number | null;
  "Vehicle ROI"?: number | null;
}

interface DashboardResponse {
  view: "default" | "full";
  role: string;
  kpis: KPIData;
  appliedFilters: DashboardFilters | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"default" | "full">("default");
  const [filters, setFilters] = useState<DashboardFilters>({});

  // Mock data for filter dropdowns - in production, fetch from API
  const [vehicleTypes] = useState<string[]>([
    "Truck",
    "Van",
    "Sedan",
    "SUV",
  ]);
  const [statuses] = useState<string[]>([
    "Available",
    "On Trip",
    "In Shop",
    "Retired",
  ]);
  const [regions] = useState<string[]>([
    "North",
    "South",
    "East",
    "West",
    "Central",
  ]);

  useEffect(() => {
    fetchDashboard();
  }, [view, filters]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append("view", view);
      if (filters.vehicleType) params.append("vehicleType", filters.vehicleType);
      if (filters.status) params.append("status", filters.status);
      if (filters.region) params.append("region", filters.region);

      const response = await fetch(`/api/dashboard?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized. Please log in.");
        }
        throw new Error("Failed to fetch dashboard data");
      }

      const dashboardData: DashboardResponse = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setView((prev) => (prev === "default" ? "full" : "default"));
  };

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <Button onClick={fetchDashboard} variant="outline" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content py-8 px-4 sm:px-6">
      {/* Header */}
      <PageHeader
        title="Operations Dashboard"
        description="Real-time fleet operations metrics."
        actions={
          <>
            {data?.role && (
              <Badge variant="secondary" className="text-xs">
                {data.role}
              </Badge>
            )}
            <Button
              onClick={toggleView}
              variant="outline"
              className="flex items-center gap-2"
            >
              {view === "default" ? (
                <>
                  <Maximize2 className="h-4 w-4" />
                  Show All KPIs
                </>
              ) : (
                <>
                  <Minimize2 className="h-4 w-4" />
                  Default View
                </>
              )}
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-6">
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          vehicleTypes={vehicleTypes}
          statuses={statuses}
          regions={regions}
        />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {/* Fleet Manager KPIs */}
        {data?.kpis["Active Vehicles"] !== undefined && (
          <KPICard
            title="Active Vehicles"
            value={data.kpis["Active Vehicles"]}
            icon={Car}
            description="Vehicles currently on trip"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Available Vehicles"] !== undefined && (
          <KPICard
            title="Available Vehicles"
            value={data.kpis["Available Vehicles"]}
            icon={Car}
            description="Ready for dispatch"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Vehicles in Maintenance"] !== undefined && (
          <KPICard
            title="Vehicles in Maintenance"
            value={data.kpis["Vehicles in Maintenance"]}
            icon={Wrench}
            description="Currently in shop"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Fleet Utilization"] !== undefined && (
          <KPICard
            title="Fleet Utilization"
            value={data.kpis["Fleet Utilization"]}
            unit="%"
            icon={TrendingUp}
            description="Percentage of fleet on trip"
            isLoading={isLoading}
          />
        )}

        {/* Driver Role KPIs */}
        {data?.kpis["Pending Trips"] !== undefined && (
          <KPICard
            title="Pending Trips"
            value={data.kpis["Pending Trips"]}
            icon={Route}
            description="Awaiting dispatch"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Active Trips"] !== undefined && (
          <KPICard
            title="Active Trips"
            value={data.kpis["Active Trips"]}
            icon={Route}
            description="Currently in progress"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Available Drivers Count"] !== undefined && (
          <KPICard
            title="Available Drivers"
            value={data.kpis["Available Drivers Count"]}
            icon={Users}
            description="Ready for assignment"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Drivers On Duty"] !== undefined && (
          <KPICard
            title="Drivers On Duty"
            value={data.kpis["Drivers On Duty"]}
            icon={Users}
            description="Currently working"
            isLoading={isLoading}
          />
        )}

        {/* Safety Officer KPIs */}
        {data?.kpis["Expired License Count"] !== undefined && (
          <KPICard
            title="Expired Licenses"
            value={data.kpis["Expired License Count"]}
            icon={AlertTriangle}
            description="Require immediate attention"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Soon-To-Expire License Count"] !== undefined && (
          <KPICard
            title="Expiring Soon"
            value={data.kpis["Soon-To-Expire License Count"]}
            icon={AlertTriangle}
            description="Within 30 days"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Suspended Drivers Count"] !== undefined && (
          <KPICard
            title="Suspended Drivers"
            value={data.kpis["Suspended Drivers Count"]}
            icon={Shield}
            description="Currently suspended"
            isLoading={isLoading}
          />
        )}

        {/* Financial Analyst KPIs */}
        {data?.kpis["Operational Cost"] !== undefined && (
          <KPICard
            title="Operational Cost"
            value={data.kpis["Operational Cost"]}
            unit="USD"
            icon={DollarSign}
            description="Total fleet costs"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Fuel Efficiency"] !== undefined && (
          <KPICard
            title="Fuel Efficiency"
            value={data.kpis["Fuel Efficiency"]}
            unit="km/L"
            icon={TrendingUp}
            description="Fleet average"
            isLoading={isLoading}
          />
        )}

        {data?.kpis["Vehicle ROI"] !== undefined && (
          <KPICard
            title="Vehicle ROI"
            value={data.kpis["Vehicle ROI"]}
            icon={DollarSign}
            description="Return on investment"
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Safety Scores Section (if applicable) */}
      {data?.kpis["Safety Scores"] &&
        data.kpis["Safety Scores"].length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Driver Safety Scores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.kpis["Safety Scores"].map((driver) => (
                <KPICard
                  key={driver.driverId}
                  title={driver.driverName}
                  value={driver.score}
                  unit="/100"
                  icon={Shield}
                  isLoading={isLoading}
                />
              ))}
            </div>
          </div>
        )}

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50">
          <div className="bg-canvas rounded-lg p-6 shadow-elevated border border-hairline">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-foreground">
                Loading dashboard...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
