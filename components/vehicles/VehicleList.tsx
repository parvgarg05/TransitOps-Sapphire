"use client";

/**
 * VehicleList Component
 * 
 * Displays a table of all vehicles with filters and actions.
 * Features:
 * - List all vehicles with key information
 * - Filter by type, region, and status
 * - Create new vehicle
 * - Edit existing vehicle
 * - Retire vehicle with confirmation
 * 
 * Requirements: 3.4, 3.6
 */

import { useEffect, useState } from "react";
import { Vehicle, VehicleStatus } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VehicleForm } from "./VehicleForm";
import { RetireDialog } from "./RetireDialog";
import { Plus, Pencil } from "lucide-react";

export function VehicleList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [retiringVehicle, setRetiringVehicle] = useState<Vehicle | null>(null);

  // Fetch vehicles
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/vehicles");
      const data = await response.json();
      
      if (data.success) {
        setVehicles(data.data);
        setFilteredVehicles(data.data);
      } else {
        setError(data.error || "Failed to fetch vehicles");
      }
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Apply filters whenever vehicles or filters change
  useEffect(() => {
    let filtered = [...vehicles];

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((v) => v.type === typeFilter);
    }

    // Apply region filter
    if (regionFilter !== "all") {
      filtered = filtered.filter((v) => v.region === regionFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }

    // Apply search query (registration number or name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.registrationNumber.toLowerCase().includes(query) ||
          v.name.toLowerCase().includes(query)
      );
    }

    setFilteredVehicles(filtered);
  }, [vehicles, typeFilter, regionFilter, statusFilter, searchQuery]);

  // Get unique types and regions for filters
  const uniqueTypes = Array.from(new Set(vehicles.map((v) => v.type)));
  const uniqueRegions = Array.from(
    new Set(vehicles.map((v) => v.region).filter(Boolean))
  );

  // Status badge styling
  const getStatusBadge = (status: VehicleStatus) => {
    const variants: Record<VehicleStatus, string> = {
      Available: "bg-green-100 text-green-800 hover:bg-green-100",
      "On Trip": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      "In Shop": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      Retired: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
    return variants[status] || "";
  };

  // Handle successful create/update
  const handleSuccess = () => {
    setIsCreateDialogOpen(false);
    setEditingVehicle(null);
    fetchVehicles();
  };

  // Handle successful retire
  const handleRetireSuccess = () => {
    setRetiringVehicle(null);
    fetchVehicles();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading vehicles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchVehicles}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-end flex-1">
          {/* Search */}
          <div className="flex-1 md:max-w-xs">
            <label className="text-sm font-medium mb-1.5 block">Search</label>
            <Input
              placeholder="Search by registration or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div className="w-full md:w-40">
            <label className="text-sm font-medium mb-1.5 block">Type</label>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value || "all")}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region Filter */}
          <div className="w-full md:w-40">
            <label className="text-sm font-medium mb-1.5 block">Region</label>
            <Select value={regionFilter} onValueChange={(value) => setRegionFilter(value || "all")}>
              <SelectTrigger>
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {uniqueRegions.map((region) => (
                  <SelectItem key={region} value={region!}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <label className="text-sm font-medium mb-1.5 block">Status</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="On Trip">On Trip</SelectItem>
                <SelectItem value="In Shop">In Shop</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Create Button */}
        <Button onClick={() => setIsCreateDialogOpen(true)} className="md:ml-4">
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredVehicles.length} of {vehicles.length} vehicles
      </div>

      {/* Vehicle Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Max Load (kg)</TableHead>
              <TableHead className="text-right">Odometer (km)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No vehicles found
                </TableCell>
              </TableRow>
            ) : (
              filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">
                    {vehicle.registrationNumber}
                  </TableCell>
                  <TableCell>{vehicle.name}</TableCell>
                  <TableCell>{vehicle.type}</TableCell>
                  <TableCell>{vehicle.region || "-"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(vehicle.status)}>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {vehicle.maxLoadCapacity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {vehicle.odometer.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingVehicle(vehicle)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRetiringVehicle(vehicle)}
                        disabled={vehicle.status === "Retired"}
                      >
                        Retire
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <VehicleForm
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Edit Dialog */}
      {editingVehicle && (
        <VehicleForm
          open={true}
          onOpenChange={(open) => !open && setEditingVehicle(null)}
          vehicle={editingVehicle}
          onSuccess={handleSuccess}
        />
      )}

      {/* Retire Dialog */}
      {retiringVehicle && (
        <RetireDialog
          vehicle={retiringVehicle}
          open={true}
          onOpenChange={(open) => !open && setRetiringVehicle(null)}
          onSuccess={handleRetireSuccess}
        />
      )}
    </div>
  );
}
