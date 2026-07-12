"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CompleteTripDialog } from "./CompleteTripDialog";

interface Trip {
  id: string;
  status: "Draft" | "Dispatched" | "Completed" | "Cancelled";
  vehicleId: string;
  driverId: string;
}

interface TripActionsProps {
  trip: Trip;
  onUpdate: () => void;
}

export function TripActions({ trip, onUpdate }: TripActionsProps) {
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDispatch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${trip.id}/dispatch`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to dispatch trip");
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dispatch trip");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this trip?")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${trip.id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel trip");
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel trip");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs text-red-600 mr-2">{error}</span>
      )}

      {trip.status === "Draft" && (
        <Button
          onClick={handleDispatch}
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? "Dispatching..." : "Dispatch"}
        </Button>
      )}

      {trip.status === "Dispatched" && (
        <>
          <Button
            onClick={() => setIsCompleteDialogOpen(true)}
            disabled={isLoading}
            size="sm"
          >
            Complete
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isLoading}
            variant="destructive"
            size="sm"
          >
            {isLoading ? "Cancelling..." : "Cancel"}
          </Button>
        </>
      )}

      {trip.status === "Completed" && (
        <span className="text-xs text-gray-500">Trip completed</span>
      )}

      {trip.status === "Cancelled" && (
        <span className="text-xs text-gray-500">Trip cancelled</span>
      )}

      <CompleteTripDialog
        tripId={trip.id}
        vehicleId={trip.vehicleId}
        open={isCompleteDialogOpen}
        onOpenChange={setIsCompleteDialogOpen}
        onComplete={onUpdate}
      />
    </div>
  );
}
