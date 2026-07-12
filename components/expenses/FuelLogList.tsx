"use client";

/**
 * FuelLogList Component
 * 
 * Displays a list of fuel logs per vehicle with filtering.
 * 
 * Requirements: 8.1
 */

import { FuelLog, Vehicle } from "@/domain/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FuelLogListProps {
  fuelLogs: FuelLog[];
  vehicles: Vehicle[];
}

export function FuelLogList({ fuelLogs, vehicles }: FuelLogListProps) {
  // Create a map of vehicle IDs to registration numbers for quick lookup
  const vehicleMap = new Map(
    vehicles.map((v) => [v.id, v.registrationNumber])
  );

  // Sort fuel logs by date descending (most recent first)
  const sortedLogs = [...fuelLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate totals
  const totalLiters = fuelLogs.reduce((sum, log) => sum + log.liters, 0);
  const totalCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      {fuelLogs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Liters</p>
              <p className="text-lg font-semibold text-blue-900">
                {totalLiters.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Cost</p>
              <p className="text-lg font-semibold text-blue-900">
                ₹
                {totalCost.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Liters</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No fuel logs found
                </TableCell>
              </TableRow>
            ) : (
              sortedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.date).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {vehicleMap.get(log.vehicleId) || "Unknown"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {log.liters.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    L
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ₹
                    {log.cost.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {fuelLogs.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {sortedLogs.length} fuel log{sortedLogs.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
