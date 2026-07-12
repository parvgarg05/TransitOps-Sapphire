"use client";

/**
 * OperationalCostView Component
 * 
 * Displays operational cost per vehicle (fuel cost + qualifying maintenance cost).
 * 
 * Requirements:
 * - 8.5: Operational Cost = fuel cost + maintenance cost
 * - 8.6: Recomputed on read from live rows (within 2 seconds)
 */

import { useEffect, useState } from "react";
import { Vehicle } from "@/domain/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface OperationalCostData {
  vehicleId: string;
  registrationNumber: string;
  name: string;
  operationalCost: number;
}

interface OperationalCostViewProps {
  vehicles: Vehicle[];
  refreshTrigger?: number;
}

export function OperationalCostView({
  vehicles,
  refreshTrigger = 0,
}: OperationalCostViewProps) {
  const [costData, setCostData] = useState<OperationalCostData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOperationalCosts = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch operational cost for each vehicle
      const promises = vehicles.map(async (vehicle) => {
        const response = await fetch(
          `/api/vehicles/${vehicle.id}/operational-cost`
        );
        const data = await response.json();

        if (data.success) {
          return {
            vehicleId: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            name: vehicle.name,
            operationalCost: data.data,
          };
        } else {
          // Return 0 if there's an error fetching cost for this vehicle
          return {
            vehicleId: vehicle.id,
            registrationNumber: vehicle.registrationNumber,
            name: vehicle.name,
            operationalCost: 0,
          };
        }
      });

      const results = await Promise.all(promises);
      
      // Sort by operational cost descending
      results.sort((a, b) => b.operationalCost - a.operationalCost);
      
      setCostData(results);
    } catch (err) {
      setError("Failed to fetch operational costs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vehicles.length > 0) {
      fetchOperationalCosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length, refreshTrigger]);

  if (loading && costData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <p className="text-gray-500">Loading operational costs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg space-y-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchOperationalCosts}>Retry</Button>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <p className="text-gray-500">No vehicles available</p>
      </div>
    );
  }

  const totalOperationalCost = costData.reduce(
    (sum, item) => sum + item.operationalCost,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Operational Cost by Vehicle</h3>
          <p className="text-sm text-gray-600">
            Total: ₹{totalOperationalCost.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOperationalCosts}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration Number</TableHead>
              <TableHead>Vehicle Name</TableHead>
              <TableHead className="text-right">Operational Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                  No operational cost data available
                </TableCell>
              </TableRow>
            ) : (
              costData.map((item) => (
                <TableRow key={item.vehicleId}>
                  <TableCell className="font-medium">
                    {item.registrationNumber}
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right font-mono">
                    ₹
                    {item.operationalCost.toLocaleString("en-IN", {
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
    </div>
  );
}
