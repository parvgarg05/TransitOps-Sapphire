"use client";

import { useState } from "react";
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

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  closed: boolean;
  openedAt: string;
  closedAt: string | null;
  vehicle: {
    id: string;
    registrationNumber: string;
    name: string;
    status: string;
  };
}

interface UpdateCostDialogProps {
  log: MaintenanceLog;
  onCostUpdated: () => void;
}

export function UpdateCostDialog({ log, onCostUpdated }: UpdateCostDialogProps) {
  const [open, setOpen] = useState(false);
  const [cost, setCost] = useState(log.cost.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const costNumber = parseFloat(cost);

      // Client-side validation
      if (isNaN(costNumber)) {
        throw new Error("Cost must be a valid number");
      }

      if (costNumber < 0) {
        throw new Error("Cost cannot be negative");
      }

      if (costNumber > 999999999.99) {
        throw new Error("Cost cannot exceed 999,999,999.99");
      }

      const response = await fetch(`/api/maintenance/${log.id}/cost`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cost: costNumber }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update cost");
      }

      // Success - close dialog and refresh
      setOpen(false);
      onCostUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cost");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setCost(log.cost.toString());
        setError(null);
      } else {
        // Set current cost when opening
        setCost(log.cost.toString());
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Update Cost
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Update Maintenance Cost</DialogTitle>
            <DialogDescription>
              Update the cost for maintenance record. Current cost: {formatCurrency(log.cost)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Vehicle Info */}
            <div className="p-3 bg-gray-50 border rounded-md">
              <p className="text-sm font-medium text-gray-900">
                {log.vehicle.registrationNumber} - {log.vehicle.name}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate" title={log.description}>
                {log.description}
              </p>
            </div>

            {/* Cost Input */}
            <div className="grid gap-2">
              <Label htmlFor="cost">
                Cost (USD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                max="999999999.99"
                placeholder="Enter cost..."
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500">
                Valid range: $0.00 to $999,999,999.99
              </p>
            </div>

            {/* Validation Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                ℹ Only positive costs contribute to operational cost calculations.
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
            <Button type="submit" disabled={isLoading || !cost}>
              {isLoading ? "Updating..." : "Update Cost"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
