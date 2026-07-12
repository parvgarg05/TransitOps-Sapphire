/**
 * Driver Management Page
 * 
 * Main page for managing drivers with list view and create/edit functionality.
 * 
 * Requirements: 4.3, 4.5, 4.6
 */

"use client";

import { useState, useEffect } from "react";
import { DriverList } from "@/components/drivers/DriverList";
import { DriverForm } from "@/components/drivers/DriverForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export interface DriverWithValidity {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string; // ISO date string from API
  contactNumber: string;
  safetyScore: number;
  status: string;
  createdAt: string;
  isLicenseValid: boolean;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverWithValidity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverWithValidity | null>(null);

  // Fetch drivers from API
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/drivers");
      if (!response.ok) {
        throw new Error("Failed to fetch drivers");
      }
      const data = await response.json();
      setDrivers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleCreateDriver = () => {
    setEditingDriver(null);
    setShowForm(true);
  };

  const handleEditDriver = (driver: DriverWithValidity) => {
    setEditingDriver(driver);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDriver(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDriver(null);
    fetchDrivers(); // Refresh the list
  };

  return (
    <div className="mx-auto max-w-content px-4 sm:px-6 py-8">
      <PageHeader
        title="Driver Management"
        description="Manage driver profiles, licenses, and compliance information."
        actions={
          !showForm ? (
            <Button onClick={handleCreateDriver}>Create New Driver</Button>
          ) : undefined
        }
      />

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-md border border-error/30 bg-error/10 p-4">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading drivers...</div>
        </div>
      ) : (
        <>
          {/* Driver List */}
          {!showForm && (
            <DriverList
              drivers={drivers}
              onEdit={handleEditDriver}
              onRefresh={fetchDrivers}
            />
          )}

          {/* Driver Form */}
          {showForm && (
            <DriverForm
              driver={editingDriver}
              onClose={handleCloseForm}
              onSuccess={handleFormSuccess}
            />
          )}
        </>
      )}
    </div>
  );
}
