"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  status: string;
}

interface OpenMaintenanceDialogProps {
  onMaintenanceOpened: () => void;
}

export function OpenMaintenanceDialog({ onMaintenanceOpened }: OpenMaintenanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchVehicles();
    }
  }, [open]);

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      if (!response.ok) {
        throw new Error("Failed to fetch vehicles");
      }

      const data = await response.json();
      const allVehicles = data.data || [];
      
      // Filter for non-Retired vehicles (Available and In Shop are eligible)
      // Note: The API will reject Retired vehicles, but we can pre-filter for UX
      const eligibleVehicles = allVehicles.filter(
        (v: Vehicle) => v.status !== "RETIRED"
      );
      
      setVehicles(eligibleVehicles);
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
      setError("Failed to load vehicles");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!selectedVehicleId) {
        throw new Error("Please select a vehicle");
      }

      if (!description.trim()) {
        throw new Error("Please enter a description");
      }

      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to open maintenance");
      }

      // Success - reset form and close dialog
      setSelectedVehicleId("");
      setDescription("");
      setOpen(false);
      onMaintenanceOpened();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open maintenance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setSelectedVehicleId("");
        setDescription("");
        setError(null);
      }
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Maintenance</Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Open Maintenance Record</DialogTitle>
            <DialogDescription>
              Select a vehicle and describe the maintenance work. The vehicle will be moved to In Shop status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Vehicle Selection */}
            <div className="grid gap-2">
              <Label htmlFor="vehicle">
                Vehicle <span className="text-red-500">*</span>
              </Label>
              <NativeSelect
                id="vehicle"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                disabled={isLoading}
                required
              >
                <option value="">Select a vehicle...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registrationNumber} - {vehicle.name} ({vehicle.status})
                  </option>
                ))}
              </NativeSelect>
              {vehicles.length === 0 && (
                <p className="text-sm text-gray-500">
                  No vehicles available for maintenance. All vehicles may be Retired.
                </p>
              )}
            </div>

            {/* Vehicle Status Warning */}
            {selectedVehicle && selectedVehicle.status === "RETIRED" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  ⚠ This vehicle is Retired and cannot have maintenance opened.
                </p>
              </div>
            )}

            {selectedVehicle && selectedVehicle.status === "ON_TRIP" && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  ℹ This vehicle is currently On Trip. Opening maintenance will move it to In Shop.
                </p>
              </div>
            )}

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="description"
                type="text"
                placeholder="Enter maintenance description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500">
                Describe the maintenance work to be performed
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedVehicleId || !description.trim()}>
              {isLoading ? "Opening..." : "Open Maintenance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
