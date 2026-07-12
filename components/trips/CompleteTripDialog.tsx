"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CompleteTripDialogProps {
  tripId: string;
  vehicleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function CompleteTripDialog({
  tripId,
  vehicleId,
  open,
  onOpenChange,
  onComplete,
}: CompleteTripDialogProps) {
  const [finalOdometer, setFinalOdometer] = useState("");
  const [fuelConsumed, setFuelConsumed] = useState("");
  const [currentOdometer, setCurrentOdometer] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current vehicle odometer when dialog opens
  useEffect(() => {
    if (open && vehicleId) {
      fetch(`/api/vehicles/${vehicleId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.vehicle) {
            setCurrentOdometer(data.vehicle.odometer);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch vehicle:", err);
        });
    }
  }, [open, vehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const finalOdometerNum = parseFloat(finalOdometer);
    const fuelConsumedNum = parseFloat(fuelConsumed);

    // Validation
    if (isNaN(finalOdometerNum) || isNaN(fuelConsumedNum)) {
      setError("Please enter valid numbers");
      setIsLoading(false);
      return;
    }

    if (currentOdometer !== null && finalOdometerNum < currentOdometer) {
      setError(`Final odometer (${finalOdometerNum}) must be >= current odometer (${currentOdometer})`);
      setIsLoading(false);
      return;
    }

    if (fuelConsumedNum < 0) {
      setError("Fuel consumed must be >= 0");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          finalOdometer: finalOdometerNum,
          fuelConsumed: fuelConsumedNum,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to complete trip");
      }

      // Reset form
      setFinalOdometer("");
      setFuelConsumed("");
      setCurrentOdometer(null);
      setError(null);

      // Close dialog and refresh
      onOpenChange(false);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete trip");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFinalOdometer("");
    setFuelConsumed("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Trip</DialogTitle>
          <DialogDescription>
            Enter the final odometer reading and fuel consumed to complete this trip.
            {currentOdometer !== null && (
              <span className="block mt-2 text-sm">
                Current odometer: <strong>{currentOdometer.toLocaleString()} km</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="finalOdometer" className="text-sm font-medium">
                Final Odometer (km) *
              </label>
              <Input
                id="finalOdometer"
                type="number"
                step="0.01"
                placeholder="Enter final odometer reading"
                value={finalOdometer}
                onChange={(e) => setFinalOdometer(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="fuelConsumed" className="text-sm font-medium">
                Fuel Consumed (liters) *
              </label>
              <Input
                id="fuelConsumed"
                type="number"
                step="0.01"
                placeholder="Enter fuel consumed"
                value={fuelConsumed}
                onChange={(e) => setFuelConsumed(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Completing..." : "Complete Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
