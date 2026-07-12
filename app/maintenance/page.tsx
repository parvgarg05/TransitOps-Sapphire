"use client";

import { useState } from "react";
import { MaintenanceList } from "@/components/maintenance/MaintenanceList";
import { OpenMaintenanceDialog } from "@/components/maintenance/OpenMaintenanceDialog";

export default function MaintenancePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleMaintenanceOpened = () => {
    // Trigger refresh of maintenance list
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Open and close maintenance records, update costs, and track vehicle maintenance status.
          </p>
        </div>

        {/* Open Maintenance Button */}
        <div className="mb-6">
          <OpenMaintenanceDialog onMaintenanceOpened={handleMaintenanceOpened} />
        </div>

        {/* Maintenance List */}
        <MaintenanceList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
