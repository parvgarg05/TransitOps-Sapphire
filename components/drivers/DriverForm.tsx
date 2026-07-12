/**
 * Driver Form Component
 * 
 * Form for creating and editing drivers with full validation.
 * 
 * Requirements: 4.1, 4.4, 4.7, 4.8
 */

"use client";

import { useState, FormEvent } from "react";
import { DriverWithValidity } from "@/app/drivers/page";

interface DriverFormProps {
  driver: DriverWithValidity | null; // null for create, driver object for edit
  onClose: () => void;
  onSuccess: () => void;
}

export function DriverForm({ driver, onClose, onSuccess }: DriverFormProps) {
  const isEditMode = driver !== null;

  // Form state
  const [formData, setFormData] = useState({
    name: driver?.name || "",
    licenseNumber: driver?.licenseNumber || "",
    licenseCategory: driver?.licenseCategory || "",
    licenseExpiryDate: driver?.licenseExpiryDate
      ? new Date(driver.licenseExpiryDate).toISOString().split("T")[0]
      : "",
    contactNumber: driver?.contactNumber || "",
    safetyScore: driver?.safetyScore?.toString() || "100",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditMode ? `/api/drivers/${driver.id}` : "/api/drivers";
      const method = isEditMode ? "PATCH" : "POST";

      const body = {
        name: formData.name,
        licenseNumber: formData.licenseNumber,
        licenseCategory: formData.licenseCategory,
        licenseExpiryDate: formData.licenseExpiryDate,
        contactNumber: formData.contactNumber,
        safetyScore: parseFloat(formData.safetyScore),
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save driver");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save driver");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-canvas rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {isEditMode ? "Edit Driver" : "Create New Driver"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isEditMode
            ? "Update driver information and compliance fields"
            : "Add a new driver with all required compliance information"}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">
              Driver Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-hairline rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter driver name"
            />
          </div>

          {/* License Number */}
          <div>
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-muted-foreground mb-1">
              License Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="licenseNumber"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-hairline rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter license number"
            />
          </div>

          {/* License Category */}
          <div>
            <label htmlFor="licenseCategory" className="block text-sm font-medium text-muted-foreground mb-1">
              License Category <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="licenseCategory"
              name="licenseCategory"
              value={formData.licenseCategory}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-hairline rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Class A, Class B, CDL"
            />
          </div>

          {/* License Expiry Date */}
          <div>
            <label
              htmlFor="licenseExpiryDate"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              License Expiry Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="licenseExpiryDate"
              name="licenseExpiryDate"
              value={formData.licenseExpiryDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-hairline rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label htmlFor="contactNumber" className="block text-sm font-medium text-muted-foreground mb-1">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-hairline rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter contact number"
            />
          </div>

          {/* Safety Score */}
          <div>
            <label htmlFor="safetyScore" className="block text-sm font-medium text-muted-foreground mb-1">
              Safety Score (0-100) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="safetyScore"
              name="safetyScore"
              value={formData.safetyScore}
              onChange={handleChange}
              required
              min="0"
              max="100"
              step="0.01"
              className="w-full px-3 py-2 border border-hairline rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter safety score"
            />
            <p className="text-xs text-muted-foreground mt-1">Must be between 0 and 100</p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-hairline text-muted-foreground rounded-md hover:bg-surface-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving..." : isEditMode ? "Update Driver" : "Create Driver"}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Compliance Requirements</h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• All fields marked with * are required</li>
          <li>• License number must be unique across all drivers</li>
          <li>• Safety score must be between 0 and 100</li>
          <li>• License expiry date determines driver eligibility for trips</li>
          <li>• Drivers with expired licenses cannot be assigned to trips</li>
        </ul>
      </div>
    </div>
  );
}
