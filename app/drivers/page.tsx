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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading drivers...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-gray-600 mt-2">
            Manage driver profiles, licenses, and compliance information
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={handleCreateDriver}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Driver
          </button>
        </div>

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
      </div>
    </div>
  );
}
