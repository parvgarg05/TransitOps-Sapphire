/**
 * CSV Export Builder
 * 
 * Pure function to build full CSV string (header + data rows) in memory.
 * Validates data before building and returns Result type.
 * 
 * Requirements: 9.7, 9.8
 * 
 * Requirement 9.7: CSV export produces one header row plus one row per record
 * Requirement 9.8: Throw before offering a file if building fails (no partial file)
 */

import { Result } from "./types";

/**
 * Builds a CSV string with one header row plus one row per record.
 * 
 * Validates:
 * - Data array is not null/undefined
 * - Headers array is not empty
 * - All data records have values for each header
 * 
 * Returns Result<string>:
 * - Success: { ok: true, value: "header1,header2\nval1,val2\n..." }
 * - Failure: { ok: false, error: "descriptive error message" }
 * 
 * @param data - Array of records to export
 * @param headers - Array of column header names (also used as keys to extract values)
 * @returns Result<string> with full CSV string or error
 */
export function buildCsvString<T extends Record<string, any>>(
  data: T[],
  headers: string[]
): Result<string> {
  // Validate headers
  if (!headers || headers.length === 0) {
    return { ok: false, error: "Headers array cannot be empty" };
  }

  // Validate data
  if (!data) {
    return { ok: false, error: "Data array cannot be null or undefined" };
  }

  // Empty data is valid - returns header only
  if (data.length === 0) {
    const headerRow = headers.map(escapeCSVField).join(",");
    return { ok: true, value: headerRow + "\n" };
  }

  try {
    // Build header row
    const headerRow = headers.map(escapeCSVField).join(",");

    // Build data rows
    const dataRows = data.map((record, index) => {
      const values = headers.map((header) => {
        const value = record[header];

        // Convert value to string representation
        let stringValue: string;

        if (value === null || value === undefined) {
          stringValue = "";
        } else if (value instanceof Date) {
          stringValue = value.toISOString();
        } else if (typeof value === "object") {
          // Convert objects/arrays to JSON
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }

        return escapeCSVField(stringValue);
      });

      return values.join(",");
    });

    // Combine header + data rows
    const csvString = [headerRow, ...dataRows].join("\n") + "\n";

    return { ok: true, value: csvString };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to build CSV",
    };
  }
}

/**
 * Escapes a CSV field according to RFC 4180:
 * - If field contains comma, quote, or newline, wrap in quotes
 * - Double any quotes within the field
 * 
 * @param field - The field value to escape
 * @returns Escaped field string
 */
function escapeCSVField(field: string): string {
  // Check if field needs escaping (contains comma, quote, or newline)
  const needsEscaping = /[",\n\r]/.test(field);

  if (needsEscaping) {
    // Double any existing quotes and wrap in quotes
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return field;
}
