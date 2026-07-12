"use client";

/**
 * ExpenseManagement Component
 * 
 * Main component for fuel and expense management with:
 * - Tabbed interface for Fuel Logs and Expenses
 * - Forms for recording fuel and expenses
 * - Lists of fuel logs and expenses per vehicle
 * - Operational cost view per vehicle
 * - Filter by vehicle and date range
 * 
 * Requirements: 8.1, 8.3, 8.5
 */

import { useEffect, useState } from "react";
import { Vehicle, FuelLog, Expense } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FuelLogForm } from "./FuelLogForm";
import { ExpenseForm } from "./ExpenseForm";
import { OperationalCostView } from "./OperationalCostView";
import { FuelLogList } from "./FuelLogList";
import { ExpenseList } from "./ExpenseList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TabType = "fuel" | "expense" | "operational-cost";

export function ExpenseManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("fuel");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch vehicles
  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      const data = await response.json();
      
      if (data.success) {
        setVehicles(data.data);
      } else {
        setError(data.error || "Failed to fetch vehicles");
      }
    } catch (err) {
      setError("Failed to connect to the server");
    }
  };

  // Fetch fuel logs
  const fetchFuelLogs = async () => {
    try {
      const response = await fetch("/api/fuel");
      const data = await response.json();
      
      if (data.success) {
        setFuelLogs(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch fuel logs:", err);
    }
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/expenses");
      const data = await response.json();
      
      if (data.success) {
        setExpenses(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchVehicles(), fetchFuelLogs(), fetchExpenses()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Handle successful form submission
  const handleSuccess = () => {
    fetchFuelLogs();
    fetchExpenses();
    setRefreshTrigger((prev) => prev + 1);
  };

  // Filter fuel logs
  const filteredFuelLogs = fuelLogs.filter((log) => {
    if (vehicleFilter !== "all" && log.vehicleId !== vehicleFilter) {
      return false;
    }
    if (startDate && new Date(log.date) < new Date(startDate)) {
      return false;
    }
    if (endDate && new Date(log.date) > new Date(endDate)) {
      return false;
    }
    return true;
  });

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    if (vehicleFilter !== "all" && expense.vehicleId !== vehicleFilter) {
      return false;
    }
    if (startDate && new Date(expense.date) < new Date(startDate)) {
      return false;
    }
    if (endDate && new Date(expense.date) > new Date(endDate)) {
      return false;
    }
    return true;
  });

  const handleClearFilters = () => {
    setVehicleFilter("all");
    setStartDate("");
    setEndDate("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("fuel")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "fuel"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Fuel Logs
        </button>
        <button
          onClick={() => setActiveTab("expense")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "expense"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab("operational-cost")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "operational-cost"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Operational Cost
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "fuel" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fuel Log Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Record Fuel Log</h2>
            <FuelLogForm vehicles={vehicles} onSuccess={handleSuccess} />
          </Card>

          {/* Fuel Log List */}
          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Filters</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-vehicle">Vehicle</Label>
                  <Select value={vehicleFilter} onValueChange={(value) => setVehicleFilter(value || "all")}>
                    <SelectTrigger id="filter-vehicle">
                      <SelectValue placeholder="All Vehicles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vehicles</SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.registrationNumber} - {vehicle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filter-start-date">Start Date</Label>
                    <Input
                      id="filter-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-end-date">End Date</Label>
                    <Input
                      id="filter-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <Button variant="outline" onClick={handleClearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Fuel Logs</h2>
              <FuelLogList fuelLogs={filteredFuelLogs} vehicles={vehicles} />
            </Card>
          </div>
        </div>
      )}

      {activeTab === "expense" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Record Expense</h2>
            <ExpenseForm vehicles={vehicles} onSuccess={handleSuccess} />
          </Card>

          {/* Expense List */}
          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Filters</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-vehicle-expense">Vehicle</Label>
                  <Select value={vehicleFilter} onValueChange={(value) => setVehicleFilter(value || "all")}>
                    <SelectTrigger id="filter-vehicle-expense">
                      <SelectValue placeholder="All Vehicles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vehicles</SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.registrationNumber} - {vehicle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filter-start-date-expense">Start Date</Label>
                    <Input
                      id="filter-start-date-expense"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-end-date-expense">End Date</Label>
                    <Input
                      id="filter-end-date-expense"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <Button variant="outline" onClick={handleClearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Expenses</h2>
              <ExpenseList expenses={filteredExpenses} vehicles={vehicles} />
            </Card>
          </div>
        </div>
      )}

      {activeTab === "operational-cost" && (
        <Card className="p-6">
          <OperationalCostView vehicles={vehicles} refreshTrigger={refreshTrigger} />
        </Card>
      )}
    </div>
  );
}
