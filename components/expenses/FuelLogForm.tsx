"use client";

/**
 * FuelLogForm Component
 * 
 * Form for recording fuel logs with validation.
 * 
 * Requirements:
 * - 8.1: Fuel log valid iff liters > 0, cost ≥ 0, date ≤ today
 * - 8.2: Reject fuel log with invalid fields (field-specific errors)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Vehicle } from "@/domain/types";

interface FuelLogFormProps {
  vehicles: Vehicle[];
  onSuccess: () => void;
}

export function FuelLogForm({ vehicles, onSuccess }: FuelLogFormProps) {
  const [vehicleId, setVehicleId] = useState<string>("");
  const [liters, setLiters] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/fuel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          liters: parseFloat(liters),
          cost: parseFloat(cost),
          date,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setVehicleId("");
        setLiters("");
        setCost("");
        setDate(new Date().toISOString().split("T")[0]);
        onSuccess();
      } else {
        // Parse field-specific errors from error message
        const errorMsg = data.error || "Failed to record fuel log";
        
        // Check for specific field errors
        if (errorMsg.includes("liters")) {
          setFieldErrors({ liters: errorMsg });
        } else if (errorMsg.includes("cost")) {
          setFieldErrors({ cost: errorMsg });
        } else if (errorMsg.includes("date")) {
          setFieldErrors({ date: errorMsg });
        } else if (errorMsg.includes("vehicle")) {
          setFieldErrors({ vehicleId: errorMsg });
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setVehicleId("");
    setLiters("");
    setCost("");
    setDate(new Date().toISOString().split("T")[0]);
    setError(null);
    setFieldErrors({});
  };

  // Get today's date in YYYY-MM-DD format for max attribute
  const today = new Date().toISOString().split("T")[0];

  // Filter only available vehicles (optional enhancement)
  const availableVehicles = vehicles.filter((v) => v.status !== "Retired");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fuel-vehicle">
          Vehicle <span className="text-red-500">*</span>
        </Label>
        <Select value={vehicleId} onValueChange={(value) => setVehicleId(value || "")}>
          <SelectTrigger id="fuel-vehicle">
            <SelectValue placeholder="Select a vehicle" />
          </SelectTrigger>
          <SelectContent>
            {availableVehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.registrationNumber} - {vehicle.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.vehicleId && (
          <p className="text-sm text-red-500">{fieldErrors.vehicleId}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fuel-liters">
            Liters <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fuel-liters"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g., 50.5"
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            required
          />
          {fieldErrors.liters && (
            <p className="text-sm text-red-500">{fieldErrors.liters}</p>
          )}
          <p className="text-xs text-muted-foreground">Must be greater than 0</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuel-cost">
            Cost <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fuel-cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 2500.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
          />
          {fieldErrors.cost && (
            <p className="text-sm text-red-500">{fieldErrors.cost}</p>
          )}
          <p className="text-xs text-muted-foreground">Must be greater than or equal to 0</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fuel-date">
          Date <span className="text-red-500">*</span>
        </Label>
        <Input
          id="fuel-date"
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        {fieldErrors.date && (
          <p className="text-sm text-red-500">{fieldErrors.date}</p>
        )}
        <p className="text-xs text-muted-foreground">Cannot be in the future</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading || !vehicleId || !liters || !cost || !date}>
          {loading ? "Recording..." : "Record Fuel Log"}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </form>
  );
}
