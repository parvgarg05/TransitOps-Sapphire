"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { TripActions } from "./TripActions";

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
}

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
}

interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  plannedDistance: number;
  finalOdometer: number | null;
  fuelConsumed: number | null;
  status: "Draft" | "Dispatched" | "Completed" | "Cancelled";
  createdAt: string;
  vehicle?: Vehicle;
  driver?: Driver;
}

interface TripListProps {
  refreshTrigger?: number;
}

export function TripList({ refreshTrigger = 0 }: TripListProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchTrips = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = statusFilter
        ? `/api/trips?status=${statusFilter}`
        : "/api/trips";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch trips");
      }

      const data = await response.json();
      setTrips(data.trips || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trips");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [statusFilter, refreshTrigger]);

  const getStatusBadgeVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Draft":
        return "secondary";
      case "Dispatched":
        return "default";
      case "Completed":
        return "outline";
      case "Cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (error) {
    return (
      <div className="border rounded-lg p-6 bg-red-50 text-red-600">
        <p className="font-medium">Error loading trips</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={fetchTrips}
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
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-sm font-medium">
            Filter by Status:
          </label>
          <NativeSelect
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </NativeSelect>
        </div>
        <div className="text-sm text-gray-600">
          {isLoading ? "Loading..." : `${trips.length} trip${trips.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Trip Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading trips...
          </div>
        ) : trips.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No trips found. {statusFilter && "Try changing the filter or "}Create your first trip to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Source → Destination
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Cargo (kg)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Distance (km)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {trip.source}
                      </div>
                      <div className="text-sm text-gray-500">
                        → {trip.destination}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {trip.vehicle ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {trip.vehicle.registrationNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {trip.vehicle.name}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Vehicle ID: {trip.vehicleId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {trip.driver ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {trip.driver.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {trip.driver.licenseNumber}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Driver ID: {trip.driverId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {trip.cargoWeight.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        Planned: {trip.plannedDistance.toLocaleString()}
                      </div>
                      {trip.finalOdometer !== null && (
                        <div className="text-xs text-gray-500">
                          Final: {trip.finalOdometer.toLocaleString()}
                        </div>
                      )}
                      {trip.fuelConsumed !== null && (
                        <div className="text-xs text-gray-500">
                          Fuel: {trip.fuelConsumed.toLocaleString()} L
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusBadgeVariant(trip.status)}>
                        {trip.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <TripActions trip={trip} onUpdate={fetchTrips} />
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
