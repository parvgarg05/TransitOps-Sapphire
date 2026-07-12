/**
 * Vehicle Registry Page
 *
 * Main page for vehicle management showing list of all vehicles with
 * create, edit, and retire actions.
 *
 * Requirements: 3.4, 3.6
 */

import { VehicleList } from "@/components/vehicles/VehicleList";
import { VehicleDocumentsSection } from "@/components/vehicles/VehicleDocumentsSection";
import { PageHeader } from "@/components/layout/PageHeader";

export default function VehiclesPage() {
  return (
    <div className="mx-auto max-w-content px-4 sm:px-6 py-8">
      <PageHeader
        title="Vehicle Registry"
        description="Manage your fleet vehicles, track status, and maintain vehicle records."
      />
      <VehicleList />
      <VehicleDocumentsSection />
    </div>
  );
}
