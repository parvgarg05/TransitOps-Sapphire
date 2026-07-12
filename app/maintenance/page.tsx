"use client";

import { useState } from "react";
import { MaintenanceList } from "@/components/maintenance/MaintenanceList";
import { OpenMaintenanceDialog } from "@/components/maintenance/OpenMaintenanceDialog";
import { PageHeader } from "@/components/layout/PageHeader";

export default function MaintenancePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleMaintenanceOpened = () => {
    // Trigger refresh of maintenance list
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="mx-auto max-w-content px-4 sm:px-6 py-8">
      <PageHeader
        title="Maintenance Management"
        description="Open and close maintenance records, update costs, and track vehicle maintenance status."
        actions={
          <OpenMaintenanceDialog onMaintenanceOpened={handleMaintenanceOpened} />
        }
      />

      {/* Maintenance List */}
      <MaintenanceList refreshTrigger={refreshTrigger} />
    </div>
  );
}
