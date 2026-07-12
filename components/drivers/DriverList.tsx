/**
 * Driver List Component
 * 
 * Displays drivers in a table with license status indicators and filters.
 * 
 * Requirements: 4.3, 4.5, 4.6
 */

"use client";

import { useState, useMemo } from "react";
import { DriverWithValidity } from "@/app/drivers/page";
import { isLicenseExpired, isLicenseSoonToExpire } from "@/domain/license";
import { Input } from "@/components/ui/input";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface DriverListProps {
  drivers: DriverWithValidity[];
  onEdit: (driver: DriverWithValidity) => void;
  onRefresh: () => void;
}

type LicenseValidityStatus = "valid" | "soon-to-expire" | "expired";

// Columns that support click-to-sort in the driver table
type DriverSortKey = "name" | "status" | "licenseExpiryDate" | "safetyScore";
type SortDirection = "asc" | "desc";

export function DriverList({ drivers, onEdit, onRefresh }: DriverListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [validityFilter, setValidityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sort state — null key preserves the default order
  const [sortKey, setSortKey] = useState<DriverSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Get license validity status
  const getLicenseValidityStatus = (driver: DriverWithValidity): LicenseValidityStatus => {
    const today = new Date();
    const expiryDate = new Date(driver.licenseExpiryDate);

    if (isLicenseExpired(expiryDate, today)) {
      return "expired";
    } else if (isLicenseSoonToExpire(expiryDate, today)) {
      return "soon-to-expire";
    } else {
      return "valid";
    }
  };

  // Get unique statuses and categories for filters
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(drivers.map((d) => d.status))),
    [drivers]
  );
  const uniqueCategories = useMemo(
    () => Array.from(new Set(drivers.map((d) => d.licenseCategory))),
    [drivers]
  );

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return drivers.filter((driver) => {
      // Status filter
      if (statusFilter !== "all" && driver.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && driver.licenseCategory !== categoryFilter) {
        return false;
      }

      // Validity filter
      if (validityFilter !== "all") {
        const validity = getLicenseValidityStatus(driver);
        if (validity !== validityFilter) {
          return false;
        }
      }

      // Search query (name or license number)
      if (query) {
        const matches =
          driver.name.toLowerCase().includes(query) ||
          driver.licenseNumber.toLowerCase().includes(query);
        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [drivers, statusFilter, categoryFilter, validityFilter, searchQuery]);

  // Toggle sorting for a column: same column flips direction, new column resets to asc
  const handleSort = (key: DriverSortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Apply sorting on top of filtering. When no sort key is chosen, keep default order.
  const sortedDrivers = useMemo(() => {
    if (!sortKey) return filteredDrivers;

    const sorted = [...filteredDrivers].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "safetyScore") {
        comparison = a.safetyScore - b.safetyScore;
      } else if (sortKey === "licenseExpiryDate") {
        comparison =
          new Date(a.licenseExpiryDate).getTime() -
          new Date(b.licenseExpiryDate).getTime();
      } else {
        comparison = String(a[sortKey]).localeCompare(
          String(b[sortKey]),
          undefined,
          { sensitivity: "base" }
        );
      }

      return sortDir === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredDrivers, sortKey, sortDir]);

  // Sort indicator icon for a given sortable column header
  const SortIcon = ({ column }: { column: DriverSortKey }) => {
    if (sortKey !== column) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return sortDir === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-foreground" />
    );
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get license validity badge
  const getLicenseValidityBadge = (driver: DriverWithValidity) => {
    const validity = getLicenseValidityStatus(driver);

    const badges = {
      expired: (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expired
        </span>
      ),
      "soon-to-expire": (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Soon to Expire
        </span>
      ),
      valid: (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Valid
        </span>
      ),
    };

    return badges[validity];
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      Available: "bg-green-100 text-green-800",
      "On Trip": "bg-blue-100 text-blue-800",
      "Off Duty": "bg-gray-100 text-gray-800",
      Suspended: "bg-red-100 text-red-800",
    };

    const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
      >
        {status}
      </span>
    );
  };

  if (drivers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No drivers found. Create your first driver to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or license number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by License Category
            </label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Validity Filter */}
          <div>
            <label htmlFor="validity-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by License Validity
            </label>
            <select
              id="validity-filter"
              value={validityFilter}
              onChange={(e) => setValidityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="valid">Valid</option>
              <option value="soon-to-expire">Soon to Expire</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredDrivers.length} of {drivers.length} drivers
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-foreground"
                >
                  Name
                  <SortIcon column="name" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                License Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => handleSort("status")}
                  className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-foreground"
                >
                  Status
                  <SortIcon column="status" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => handleSort("licenseExpiryDate")}
                  className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-foreground"
                >
                  Expiry Date
                  <SortIcon column="licenseExpiryDate" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                License Validity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => handleSort("safetyScore")}
                  className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-foreground"
                >
                  Safety Score
                  <SortIcon column="safetyScore" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedDrivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{driver.licenseNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{driver.licenseCategory}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(driver.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(driver.licenseExpiryDate)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getLicenseValidityBadge(driver)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{driver.safetyScore.toFixed(1)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{driver.contactNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(driver)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDrivers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No drivers match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
