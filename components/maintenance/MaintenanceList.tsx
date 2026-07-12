"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { UpdateCostDialog } from "./UpdateCostDialog";
import { useToast } from "@/components/ui/toast";

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  status: string;
}

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  closed: boolean;
  openedAt: string;
  closedAt: string | null;
  vehicle: Vehicle;
}

interface MaintenanceListProps {
  refreshTrigger?: number;
}

export function MaintenanceList({ refreshTrigger = 0 }: MaintenanceListProps) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [closingId, setClosingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) {
        params.append("status", statusFilter);
      }
      if (vehicleFilter) {
        params.append("vehicleId", vehicleFilter);
      }

      const url = `/api/maintenance${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch maintenance logs");
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch maintenance logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, vehicleFilter, refreshTrigger]);

  const handleCloseMaintenance = async (logId: string) => {
    setClosingId(logId);
    try {
      const response = await fetch(`/api/maintenance/${logId}/close`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to close maintenance");
      }

      // Refresh the list
      fetchLogs();
      toast({
        title: "Maintenance closed",
        description: "The vehicle has been returned to service.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Couldn't close maintenance",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setClosingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (error) {
    return (
      <div className="border rounded-lg p-6 bg-red-50 text-red-600">
        <p className="font-medium">Error loading maintenance logs</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={fetchLogs}
          className="mt-4 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-sm font-medium">
            Status:
          </label>
          <NativeSelect
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </NativeSelect>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="vehicleFilter" className="text-sm font-medium">
            Vehicle:
          </label>
          <NativeSelect
            id="vehicleFilter"
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="w-48"
          >
            <option value="">All Vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registrationNumber} - {vehicle.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${logs.length} record${logs.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="border rounded-lg overflow-hidden bg-canvas">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading maintenance logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No maintenance records found. {(statusFilter || vehicleFilter) && "Try changing the filters or "}
            Open a maintenance record to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-card border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Opened Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Closed Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-card">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-foreground">
                        {log.vehicle.registrationNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.vehicle.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-foreground max-w-xs truncate" title={log.description}>
                        {log.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-foreground">
                        {formatCurrency(log.cost)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={log.closed ? "outline" : "default"}>
                        {log.closed ? "Closed" : "Open"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatDate(log.openedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {log.closedAt ? formatDate(log.closedAt) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!log.closed && (
                          <>
                            <UpdateCostDialog
                              log={log}
                              onCostUpdated={fetchLogs}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCloseMaintenance(log.id)}
                              disabled={closingId === log.id}
                            >
                              {closingId === log.id ? "Closing..." : "Close"}
                            </Button>
                          </>
                        )}
                        {log.closed && (
                          <span className="text-sm text-muted-foreground">No actions</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
