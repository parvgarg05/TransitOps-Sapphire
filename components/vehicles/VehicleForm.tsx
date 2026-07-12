"use client";

/**
 * VehicleForm Component
 * 
 * Create or edit vehicle form with validation.
 * Features:
 * - All fields required per validators
 * - Registration number read-only on edit (immutable)
 * - Field-specific validation errors
 * - Form state management with react-hook-form
 * 
 * Requirements: 3.1, 3.5, 3.8, 3.9
 */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle;
  onSuccess: () => void;
}

interface VehicleFormData {
  registrationNumber: string;
  name: string;
  type: string;
  region: string;
  maxLoadCapacity: string;
  odometer: string;
  acquisitionCost: string;
  revenue: string;
}

export function VehicleForm({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: VehicleFormProps) {
  const isEditing = !!vehicle;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleFormData>({
    defaultValues: {
      registrationNumber: "",
      name: "",
      type: "",
      region: "",
      maxLoadCapacity: "",
      odometer: "",
      acquisitionCost: "",
      revenue: "0",
    },
  });

  // Reset form when dialog opens or vehicle changes
  useEffect(() => {
    if (open) {
      if (vehicle) {
        reset({
          registrationNumber: vehicle.registrationNumber,
          name: vehicle.name,
          type: vehicle.type,
          region: vehicle.region || "",
          maxLoadCapacity: vehicle.maxLoadCapacity.toString(),
          odometer: vehicle.odometer.toString(),
          acquisitionCost: vehicle.acquisitionCost.toString(),
          revenue: vehicle.revenue.toString(),
        });
      } else {
        reset({
          registrationNumber: "",
          name: "",
          type: "",
          region: "",
          maxLoadCapacity: "",
          odometer: "",
          acquisitionCost: "",
          revenue: "0",
        });
      }
      setError(null);
    }
  }, [open, vehicle, reset]);

  const onSubmit = async (data: VehicleFormData) => {
    try {
      setSubmitting(true);
      setError(null);

      // Convert string values to numbers
      const payload = {
        registrationNumber: data.registrationNumber,
        name: data.name,
        type: data.type,
        region: data.region || null,
        maxLoadCapacity: parseFloat(data.maxLoadCapacity),
        odometer: parseFloat(data.odometer),
        acquisitionCost: parseFloat(data.acquisitionCost),
        revenue: parseFloat(data.revenue),
      };

      const url = isEditing
        ? `/api/vehicles/${vehicle.id}`
        : "/api/vehicles";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to save vehicle");
      }
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Vehicle" : "Create New Vehicle"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update vehicle information. Registration number cannot be changed."
              : "Add a new vehicle to the registry. All fields are required."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">
              Registration Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="registrationNumber"
              {...register("registrationNumber", {
                required: "Registration number is required",
              })}
              disabled={isEditing} // Immutable on edit (Req 3.5)
              className={isEditing ? "bg-gray-100" : ""}
            />
            {errors.registrationNumber && (
              <p className="text-sm text-red-500">
                {errors.registrationNumber.message}
              </p>
            )}
            {isEditing && (
              <p className="text-xs text-gray-500">
                Registration number cannot be changed
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Vehicle Name/Model <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register("name", {
                required: "Vehicle name is required",
              })}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Vehicle Type <span className="text-red-500">*</span>
            </Label>
            <Input
              id="type"
              {...register("type", {
                required: "Vehicle type is required",
              })}
              placeholder="e.g., Truck, Van, Car"
            />
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              {...register("region")}
              placeholder="e.g., North, South, East, West"
            />
            <p className="text-xs text-gray-500">Optional</p>
          </div>

          {/* Two-column layout for numeric fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Load Capacity */}
            <div className="space-y-2">
              <Label htmlFor="maxLoadCapacity">
                Max Load Capacity (kg) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="maxLoadCapacity"
                type="number"
                step="0.01"
                {...register("maxLoadCapacity", {
                  required: "Max load capacity is required",
                  validate: (value) => {
                    const num = parseFloat(value);
                    if (isNaN(num) || num <= 0) {
                      return "Must be greater than 0";
                    }
                    if (num > 100000) {
                      return "Must not exceed 100,000 kg";
                    }
                    return true;
                  },
                })}
              />
              {errors.maxLoadCapacity && (
                <p className="text-sm text-red-500">
                  {errors.maxLoadCapacity.message}
                </p>
              )}
            </div>

            {/* Odometer */}
            <div className="space-y-2">
              <Label htmlFor="odometer">
                Odometer (km) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="odometer"
                type="number"
                step="0.01"
                {...register("odometer", {
                  required: "Odometer reading is required",
                  validate: (value) => {
                    const num = parseFloat(value);
                    if (isNaN(num) || num < 0) {
                      return "Must be 0 or greater";
                    }
                    if (num > 10000000) {
                      return "Must not exceed 10,000,000 km";
                    }
                    return true;
                  },
                })}
              />
              {errors.odometer && (
                <p className="text-sm text-red-500">{errors.odometer.message}</p>
              )}
            </div>

            {/* Acquisition Cost */}
            <div className="space-y-2">
              <Label htmlFor="acquisitionCost">
                Acquisition Cost <span className="text-red-500">*</span>
              </Label>
              <Input
                id="acquisitionCost"
                type="number"
                step="0.01"
                {...register("acquisitionCost", {
                  required: "Acquisition cost is required",
                  validate: (value) => {
                    const num = parseFloat(value);
                    if (isNaN(num) || num < 0) {
                      return "Must be 0 or greater";
                    }
                    return true;
                  },
                })}
              />
              {errors.acquisitionCost && (
                <p className="text-sm text-red-500">
                  {errors.acquisitionCost.message}
                </p>
              )}
            </div>

            {/* Revenue */}
            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue</Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                {...register("revenue", {
                  validate: (value) => {
                    const num = parseFloat(value);
                    if (isNaN(num) || num < 0) {
                      return "Must be 0 or greater";
                    }
                    return true;
                  },
                })}
              />
              {errors.revenue && (
                <p className="text-sm text-red-500">{errors.revenue.message}</p>
              )}
              <p className="text-xs text-gray-500">For ROI calculation</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
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
            <Button type="submit" disabled={submitting}>
              {submitting
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                ? "Update Vehicle"
                : "Create Vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
