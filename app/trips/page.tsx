"use client";

import { useState } from "react";
import { TripList } from "@/components/trips/TripList";
import { CreateTripForm } from "@/components/trips/CreateTripForm";

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trip Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create, dispatch, complete, and cancel trips. Track cargo, vehicles, and drivers.
          </p>
        </div>

        {/* Create Trip Form */}
        <div className="mb-6">
          <CreateTripForm onTripCreated={handleTripCreated} userId={userId} />
        </div>

        {/* Trip List */}
        <TripList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
