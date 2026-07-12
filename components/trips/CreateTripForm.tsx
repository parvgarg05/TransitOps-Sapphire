"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  maxLoadCapacity: number;
  status: string;
}

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  status: string;
}

interface CreateTripFormProps {
  onTripCreated: () => void;
  userId: string;
}

export function CreateTripForm({ onTripCreated, userId }: CreateTripFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [formData, setFormData] = useState({
    source: "",
    destination: "",
    vehicleId: "",
    driverId: "",
    cargoWeight: "",
    plannedDistance: "",
  });

  // Fetch dispatch pool when form opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingPool(true);
      fetch("/api/trips/dispatch-pool")
        .then((res) => res.json())
        .then((data) => {
          setVehicles(data.vehicles || []);
          setDrivers(data.drivers || []);
        })
        .catch((err) => {
          console.error("Failed to fetch dispatch pool:", err);
          setError("Failed to load available vehicles and drivers");
        })
        .finally(() => {
          setIsLoadingPool(false);
        });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cargoWeight = parseFloat(formData.cargoWeight);
    const plannedDistance = parseFloat(formData.plannedDistance);

    // Validation
    if (isNaN(cargoWeight) || cargoWeight <= 0) {
      setError("Cargo weight must be greater than 0");
      setIsLoading(false);
      return;
    }

    if (isNaN(plannedDistance) || plannedDistance <= 0) {
      setError("Planned distance must be greater than 0");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: formData.source.trim(),
          destination: formData.destination.trim(),
          vehicleId: formData.vehicleId,
          driverId: formData.driverId,
          cargoWeight,
          plannedDistance,
          createdByUserId: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create trip");
      }

      // Reset form
      setFormData({
        source: "",
        destination: "",
        vehicleId: "",
        driverId: "",
        cargoWeight: "",
        plannedDistance: "",
      });
      setIsOpen(false);
      onTripCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trip");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        Create New Trip
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-canvas shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Create New Trip</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>

      {isLoadingPool ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading available vehicles and drivers...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="source" className="text-sm font-medium">
                Source *
              </label>
              <Input
                id="source"
                placeholder="Enter source location"
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="destination" className="text-sm font-medium">
                Destination *
              </label>
              <Input
                id="destination"
                placeholder="Enter destination location"
                value={formData.destination}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="vehicleId" className="text-sm font-medium">
              Vehicle * {vehicles.length === 0 && "(No available vehicles)"}
            </label>
            <NativeSelect
              id="vehicleId"
              value={formData.vehicleId}
              onChange={(e) =>
                setFormData({ ...formData, vehicleId: e.target.value })
              }
              required
              disabled={isLoading || vehicles.length === 0}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registrationNumber} - {vehicle.name} ({vehicle.type}) - Max Load: {vehicle.maxLoadCapacity} kg
                </option>
              ))}
            </NativeSelect>
            {selectedVehicle && (
              <p className="text-xs text-muted-foreground">
                Max capacity: {selectedVehicle.maxLoadCapacity} kg
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="driverId" className="text-sm font-medium">
              Driver * {drivers.length === 0 && "(No available drivers)"}
            </label>
            <NativeSelect
              id="driverId"
              value={formData.driverId}
              onChange={(e) =>
                setFormData({ ...formData, driverId: e.target.value })
              }
              required
              disabled={isLoading || drivers.length === 0}
            >
              <option value="">Select a driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - License: {driver.licenseNumber} ({driver.licenseCategory})
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="cargoWeight" className="text-sm font-medium">
                Cargo Weight (kg) *
              </label>
              <Input
                id="cargoWeight"
                type="number"
                step="0.01"
                placeholder="Enter cargo weight"
                value={formData.cargoWeight}
                onChange={(e) =>
                  setFormData({ ...formData, cargoWeight: e.target.value })
                }
                required
                disabled={isLoading}
              />
              {selectedVehicle && formData.cargoWeight && (
                <p className="text-xs text-muted-foreground">
                  {parseFloat(formData.cargoWeight) <= selectedVehicle.maxLoadCapacity ? (
                    <span className="text-green-600">✓ Within capacity</span>
                  ) : (
                    <span className="text-red-600">✗ Exceeds capacity ({selectedVehicle.maxLoadCapacity} kg)</span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="plannedDistance" className="text-sm font-medium">
                Planned Distance (km) *
              </label>
              <Input
                id="plannedDistance"
                type="number"
                step="0.01"
                placeholder="Enter planned distance"
                value={formData.plannedDistance}
                onChange={(e) =>
                  setFormData({ ...formData, plannedDistance: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {vehicles.length === 0 && drivers.length === 0 && (
            <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
              No available vehicles or drivers. Please make sure there are vehicles with status "Available" and drivers with status "Available" and valid licenses.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setError(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || vehicles.length === 0 || drivers.length === 0}>
              {isLoading ? "Creating..." : "Create Trip (Draft)"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
