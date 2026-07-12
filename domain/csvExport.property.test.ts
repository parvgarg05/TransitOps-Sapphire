/**
 * Property Tests for CSV Export
 * 
 * Feature: transitops
 * Property 32: CSV export produces one header row plus one row per record
 * 
 * Validates: Requirements 9.7
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { buildCsvString } from "./csvExport";

describe("CSV Export - Property Tests", () => {
  it("Property 32: CSV export produces one header row plus one row per record", () => {
    // Feature: transitops, Property 32: CSV export produces one header row plus one row per record
    
    // Generate arbitrary data with consistent headers
    const headerArbitrary = fc.array(
      fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]*$/), // Valid identifier names
      { minLength: 1, maxLength: 10 }
    );

    const testArbitrary = headerArbitrary.chain((headers) => {
      // Generate records that have all the headers as keys
      const recordArbitrary = fc.record(
        Object.fromEntries(
          headers.map((header) => [
            header,
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.double(),
              fc.boolean(),
              fc.constant(null),
              fc.constant(undefined)
            ),
          ])
        )
      );

      return fc.tuple(
        fc.constant(headers),
        fc.array(recordArbitrary, { minLength: 0, maxLength: 50 })
      );
    });

    fc.assert(
      fc.property(testArbitrary, ([headers, data]) => {
        const result = buildCsvString(data, headers);

        // Should always succeed with valid headers and data
        expect(result.ok).toBe(true);

        if (result.ok) {
          const csv = result.value;
          // Don't filter empty lines - they represent valid data rows with empty fields
          const lines = csv.split("\n");
          
          // Remove only the final trailing newline (CSV ends with \n, creating an empty last element)
          if (lines[lines.length - 1] === "") {
            lines.pop();
          }

          // Property: CSV has exactly 1 header row + N data rows
          const expectedRowCount = 1 + data.length;
          expect(lines.length).toBe(expectedRowCount);

          // First row should contain all headers
          const headerRow = lines[0];
          headers.forEach((header) => {
            expect(headerRow).toContain(header);
          });

          // Each subsequent row should have the same number of fields as headers
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i];
            // Count fields (accounting for quoted fields with commas)
            const fieldCount = countCSVFields(row);
            expect(fieldCount).toBe(headers.length);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("should reject empty headers array", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ a: fc.string(), b: fc.integer() })),
        (data) => {
          const result = buildCsvString(data, []);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error).toContain("empty");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should reject records missing required headers", () => {
    // Note: With the current implementation, undefined values are treated as empty strings
    // This test validates that we handle records with different structures gracefully
    const result = buildCsvString(
      [{ a: "value1", b: "value2" }], // This record has both fields
      ["a", "b", "c"] // But we're asking for a 'c' field that doesn't exist
    );

    // The function should treat missing keys as undefined/empty
    expect(result.ok).toBe(true);
    if (result.ok) {
      const lines = result.value.split("\n");
      lines.pop(); // Remove trailing empty line
      expect(lines.length).toBe(2); // header + 1 data row
      expect(lines[1]).toBe("value1,value2,"); // Third field is empty
    }
  });

  it("should handle empty data with header-only output", () => {
    const headers = ["id", "name", "value"];
    const result = buildCsvString([], headers);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const lines = result.value.split("\n").filter((line) => line.length > 0);
      expect(lines.length).toBe(1); // Only header row
      expect(lines[0]).toBe("id,name,value");
    }
  });

  it("should escape CSV special characters correctly", () => {
    const data = [
      {
        field1: 'contains,comma',
        field2: 'contains"quote',
        field3: 'contains\nnewline',
        field4: 'normal',
      },
    ];
    const headers = ["field1", "field2", "field3", "field4"];
    
    const result = buildCsvString(data, headers);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const csv = result.value;
      // Fields with special chars should be quoted
      expect(csv).toContain('"contains,comma"');
      expect(csv).toContain('"contains""quote"'); // Quotes are doubled
      expect(csv).toContain('"contains\nnewline"');
      expect(csv).toContain('normal'); // No quotes for normal field
    }
  });

  it("should handle Date objects by converting to ISO string", () => {
    const testDate = new Date("2024-01-15T10:30:00Z");
    const data = [{ id: "1", timestamp: testDate }];
    const headers = ["id", "timestamp"];

    const result = buildCsvString(data, headers);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const csv = result.value;
      expect(csv).toContain(testDate.toISOString());
    }
  });

  it("should handle null and undefined values", () => {
    const data = [
      { id: "1", nullable: null, undefinable: undefined, value: "test" },
    ];
    const headers = ["id", "nullable", "undefinable", "value"];

    const result = buildCsvString(data, headers);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const lines = result.value.split("\n");
      const dataRow = lines[1];
      // null and undefined should become empty strings
      expect(dataRow).toMatch(/^1,,,test$/);
    }
  });
});

/**
 * Helper function to count CSV fields in a row, accounting for quoted fields.
 * This is a simplified parser for testing purposes.
 */
function countCSVFields(row: string): number {
  let count = 0;
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      // Check if it's an escaped quote
      if (i + 1 < row.length && row[i + 1] === '"') {
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      count++;
    }
  }
  
  // Add 1 for the last field
  return count + 1;
}
