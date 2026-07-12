/**
 * Vehicle Registry Page
 * 
 * Main page for vehicle management showing list of all vehicles with
 * create, edit, and retire actions.
 * 
 * Requirements: 3.4, 3.6
 */

import { VehicleList } from "@/components/vehicles/VehicleList";

export default function VehiclesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vehicle Registry</h1>
        <p className="text-gray-600">
          Manage your fleet vehicles, track status, and maintain vehicle records
        </p>
      </div>
      <VehicleList />
    </div>
  );
}
