"use client";

/**
 * RetireDialog Component
 * 
 * Confirmation dialog for retiring a vehicle.
 * Features:
 * - Display vehicle information
 * - Confirmation before retire action
 * - Disabled for already-retired vehicles
 * - Error handling
 * 
 * Requirements: 3.6, 3.7
 */

import { useState } from "react";
import { Vehicle } from "@/domain/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface RetireDialogProps {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RetireDialog({
  vehicle,
  open,
  onOpenChange,
  onSuccess,
}: RetireDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetire = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/vehicles/${vehicle.id}/retire`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to retire vehicle");
      }
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setSubmitting(false);
    }
  };

  const isAlreadyRetired = vehicle.status === "Retired";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Retire Vehicle
          </DialogTitle>
          <DialogDescription>
            {isAlreadyRetired
              ? "This vehicle is already retired."
              : "Are you sure you want to retire this vehicle? This action will exclude it from dispatch selection."}
          </DialogDescription>
        </DialogHeader>

        {/* Vehicle Information */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">
              Registration Number:
            </span>
            <span className="text-sm text-gray-900">
              {vehicle.registrationNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Name:</span>
            <span className="text-sm text-gray-900">{vehicle.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Type:</span>
            <span className="text-sm text-gray-900">{vehicle.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">
              Current Status:
            </span>
            <span className="text-sm text-gray-900">{vehicle.status}</span>
          </div>
        </div>

        {/* Warning Message */}
        {!isAlreadyRetired && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded text-sm">
            <p className="font-medium mb-1">Warning:</p>
            <p>
              Once retired, this vehicle will no longer be available for dispatch
              selection. You can still view its information and history.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRetire}
            disabled={submitting || isAlreadyRetired}
          >
            {submitting ? "Retiring..." : "Retire Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
