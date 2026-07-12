"use client";

/**
 * VehicleDocumentsSection
 *
 * Lets the user pick a vehicle from a dropdown and manage its documents.
 * Populates the dropdown from GET /api/vehicles.
 *
 * Requirements: 14.1, 14.2
 */

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { VehicleDocuments } from "@/components/vehicles/VehicleDocuments";

interface VehicleOption {
  id: string;
  name: string;
  registrationNumber: string;
}

export function VehicleDocumentsSection() {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadVehicles() {
      try {
        const res = await fetch("/api/vehicles");
        if (!res.ok) {
          throw new Error("Failed to load vehicles");
        }
        const data = await res.json();
        if (!active) return;
        const list: VehicleOption[] = data.data ?? [];
        setVehicles(list);
      } catch {
        if (active) {
          setLoadError("Unable to load vehicles.");
        }
      }
    }

    loadVehicles();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold tracking-[-0.02em] mb-4">
        Vehicle Documents
      </h2>

      <div className="grid gap-1.5 max-w-md mb-4">
        <Label htmlFor="vehicle-select">Select a vehicle</Label>
        <NativeSelect
          id="vehicle-select"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Choose a vehicle...</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.name} — {vehicle.registrationNumber}
            </option>
          ))}
        </NativeSelect>
        {loadError && (
          <p className="text-sm text-destructive">{loadError}</p>
        )}
      </div>

      {selectedId ? (
        <VehicleDocuments vehicleId={selectedId} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a vehicle to view and manage its documents.
        </p>
      )}
    </section>
  );
}
