"use client";

import { useState } from "react";
import { TripList } from "@/components/trips/TripList";
import { CreateTripForm } from "@/components/trips/CreateTripForm";
import { PageHeader } from "@/components/layout/PageHeader";

export default function TripsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // For now, use a placeholder user ID
  // In a real app, this would come from session/auth context
  const userId = "user-placeholder-id";

  const handleTripCreated = () => {
    // Trigger refresh of trip list
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="mx-auto max-w-content px-4 sm:px-6 py-8">
      <PageHeader
        title="Trip Management"
        description="Create, dispatch, complete, and cancel trips. Track cargo, vehicles, and drivers."
      />

      {/* Create Trip Form */}
      <div className="mb-6">
        <CreateTripForm onTripCreated={handleTripCreated} userId={userId} />
      </div>

      {/* Trip List */}
      <TripList refreshTrigger={refreshTrigger} />
    </div>
  );
}
