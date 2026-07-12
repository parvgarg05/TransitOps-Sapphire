/**
 * ReportCharts — visual analytics for the reports view (bonus Requirement 11).
 *
 * Renders a chart for each metric that has available data, independently of the
 * others:
 *  - Fleet Utilization  → donut (On Trip vs other non-retired vehicles)
 *  - Fuel Efficiency     → bar chart per vehicle (km/L)
 *
 * Colors reference the theme CSS variables so the charts adapt to dark mode.
 */

"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface FuelEfficiencyDatum {
  vehicleId: string;
  registrationNumber: string;
  name: string;
  fuelEfficiency: number | null;
}

interface FleetUtilization {
  utilization: number | null;
  onTripCount: number;
  nonRetiredCount: number;
}

interface ReportChartsProps {
  fuelEfficiency: FuelEfficiencyDatum[];
  fleetUtilization: FleetUtilization | null;
}

export function ReportCharts({
  fuelEfficiency,
  fleetUtilization,
}: ReportChartsProps) {
  // Fuel-efficiency chart data: only vehicles with a computed value.
  const efficiencyData = fuelEfficiency
    .filter((v) => v.fuelEfficiency !== null && v.fuelEfficiency >= 0)
    .map((v) => ({
      name: v.registrationNumber || v.name,
      efficiency: Number(v.fuelEfficiency),
    }));

  // Fleet-utilization donut: only when there is a valid percentage.
  const hasUtilization =
    fleetUtilization !== null &&
    fleetUtilization.utilization !== null &&
    fleetUtilization.nonRetiredCount > 0;

  const utilizationData = hasUtilization
    ? [
        { name: "On Trip", value: fleetUtilization!.onTripCount },
        {
          name: "Other (non-retired)",
          value: Math.max(
            fleetUtilization!.nonRetiredCount - fleetUtilization!.onTripCount,
            0
          ),
        },
      ]
    : [];

  const hasEfficiency = efficiencyData.length > 0;

  // Nothing to show — render nothing so the section stays clean.
  if (!hasUtilization && !hasEfficiency) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold tracking-[-0.02em]">
          Visual Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasUtilization && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fleet Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={utilizationData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      <Cell fill="var(--foreground)" />
                      <Cell fill="var(--surface-strong)" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--hairline)",
                        borderRadius: 8,
                        color: "var(--popover-foreground)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {fleetUtilization!.utilization}% —{" "}
                {fleetUtilization!.onTripCount} of{" "}
                {fleetUtilization!.nonRetiredCount} non-retired vehicles on trip
              </p>
            </CardContent>
          </Card>
        )}

        {hasEfficiency && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fuel Efficiency by Vehicle (km/L)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={efficiencyData}
                    margin={{ top: 8, right: 8, bottom: 8, left: -16 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--hairline)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--surface-card)" }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--hairline)",
                        borderRadius: 8,
                        color: "var(--popover-foreground)",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="efficiency"
                      fill="var(--foreground)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
