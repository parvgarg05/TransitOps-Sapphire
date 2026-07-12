/**
 * Reports Page
 * 
 * Displays three analytics reports:
 * 1. Fuel Efficiency Report (km/L per vehicle, rounded 2dp, N/A when fuel=0)
 * 2. Fleet Utilization Report (% of On Trip vehicles, rounded 1dp, N/A when no non-Retired)
 * 3. Vehicle ROI Report (revenue/acquisitionCost, rounded 2dp, N/A when acquisitionCost=0)
 * 
 * Includes CSV export functionality and proper error handling.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportCharts } from "@/components/reports/ReportCharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

interface FuelEfficiencyData {
  vehicleId: string;
  registrationNumber: string;
  name: string;
  fuelEfficiency: number | null;
}

interface FleetUtilizationData {
  utilization: number | null;
  onTripCount: number;
  nonRetiredCount: number;
}

interface VehicleROIData {
  vehicleId: string;
  registrationNumber: string;
  name: string;
  roi: number | null;
}

export default function ReportsPage() {
  const [fuelEfficiency, setFuelEfficiency] = useState<FuelEfficiencyData[]>([]);
  const [fleetUtilization, setFleetUtilization] = useState<FleetUtilizationData | null>(null);
  const [vehicleROI, setVehicleROI] = useState<VehicleROIData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all three reports in parallel
      const [fuelRes, utilizationRes, roiRes] = await Promise.all([
        fetch("/api/reports/fuel-efficiency"),
        fetch("/api/reports/fleet-utilization"),
        fetch("/api/reports/vehicle-roi"),
      ]);

      if (!fuelRes.ok || !utilizationRes.ok || !roiRes.ok) {
        throw new Error("Failed to fetch one or more reports");
      }

      const [fuelData, utilizationData, roiData] = await Promise.all([
        fuelRes.json(),
        utilizationRes.json(),
        roiRes.json(),
      ]);

      setFuelEfficiency(fuelData.data || []);
      setFleetUtilization(utilizationData.data || null);
      setVehicleROI(roiData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/reports/export?format=csv&type=vehicles");
      
      if (!response.ok) {
        throw new Error("CSV export failed");
      }

      // Get the CSV content
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vehicles-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      // Build the PDF entirely in memory from the already-fetched report data.
      // Requirement 12.1: produce a PDF containing the report data.
      const doc = new jsPDF();
      const generatedAt = new Date().toLocaleString();

      doc.setFontSize(18);
      doc.text("TransitOps — Analytics Report", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Generated ${generatedAt}`, 14, 25);
      doc.setTextColor(0);

      // Fleet Utilization summary
      const util =
        fleetUtilization?.utilization !== null &&
        fleetUtilization?.utilization !== undefined
          ? `${fleetUtilization.utilization}% (${fleetUtilization.onTripCount} of ${fleetUtilization.nonRetiredCount} non-retired on trip)`
          : "N/A";
      doc.setFontSize(12);
      doc.text(`Fleet Utilization: ${util}`, 14, 35);

      // Fuel Efficiency table
      autoTable(doc, {
        startY: 42,
        head: [["Vehicle", "Reg. No.", "Fuel Efficiency (km/L)"]],
        body: fuelEfficiency.map((v) => [
          v.name,
          v.registrationNumber,
          v.fuelEfficiency !== null ? v.fuelEfficiency.toFixed(2) : "N/A",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [17, 17, 17] },
      });

      // Vehicle ROI table (continues after the previous table)
      const afterFuelY =
        (doc as unknown as { lastAutoTable?: { finalY: number } })
          .lastAutoTable?.finalY ?? 42;
      autoTable(doc, {
        startY: afterFuelY + 8,
        head: [["Vehicle", "Reg. No.", "ROI"]],
        body: vehicleROI.map((v) => [
          v.name,
          v.registrationNumber,
          v.roi !== null ? v.roi.toFixed(2) : "N/A",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [17, 17, 17] },
      });

      doc.save(`transitops-report-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      // Requirement 12.2: show an export error on failure.
      alert(err instanceof Error ? err.message : "Failed to export PDF");
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error Loading Reports
          </h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <Button
            onClick={fetchReports}
            variant="outline"
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content py-8 px-4 sm:px-6">
      <PageHeader
        title="Analytics Reports"
        description="View comprehensive fleet analytics and performance metrics."
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={isExportingPDF || isLoading}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {isExportingPDF ? "Exporting..." : "Export PDF"}
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ReportCard
          title="Fleet Utilization"
          value={fleetUtilization?.utilization ?? null}
          unit="%"
          description={
            fleetUtilization
              ? `${fleetUtilization.onTripCount} of ${fleetUtilization.nonRetiredCount} non-retired vehicles on trip`
              : undefined
          }
          isLoading={isLoading}
        />
        <ReportCard
          title="Avg Fuel Efficiency"
          value={
            isLoading
              ? null
              : fuelEfficiency.length > 0
              ? fuelEfficiency.reduce((sum, v) => sum + (v.fuelEfficiency || 0), 0) /
                fuelEfficiency.filter((v) => v.fuelEfficiency !== null).length
              : null
          }
          unit="km/L"
          description="Average across all vehicles"
          isLoading={isLoading}
        />
        <ReportCard
          title="Avg Vehicle ROI"
          value={
            isLoading
              ? null
              : vehicleROI.length > 0
              ? vehicleROI.reduce((sum, v) => sum + (v.roi || 0), 0) /
                vehicleROI.filter((v) => v.roi !== null).length
              : null
          }
          unit="ratio"
          description="Average return on investment"
          isLoading={isLoading}
        />
      </div>

      {/* Visual Analytics (bonus Req 11) */}
      {!isLoading && (
        <ReportCharts
          fuelEfficiency={fuelEfficiency}
          fleetUtilization={fleetUtilization}
        />
      )}

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Efficiency Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Fuel Efficiency by Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : fuelEfficiency.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No fuel efficiency data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Reg. No.</TableHead>
                      <TableHead className="text-right">Efficiency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelEfficiency.map((vehicle) => (
                      <TableRow key={vehicle.vehicleId}>
                        <TableCell className="font-medium">
                          {vehicle.name}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {vehicle.registrationNumber}
                        </TableCell>
                        <TableCell className="text-right">
                          {vehicle.fuelEfficiency !== null
                            ? `${vehicle.fuelEfficiency.toFixed(2)} km/L`
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle ROI Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Vehicle ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : vehicleROI.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No ROI data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Reg. No.</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicleROI.map((vehicle) => (
                      <TableRow key={vehicle.vehicleId}>
                        <TableCell className="font-medium">
                          {vehicle.name}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {vehicle.registrationNumber}
                        </TableCell>
                        <TableCell className="text-right">
                          {vehicle.roi !== null
                            ? vehicle.roi.toFixed(2)
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
