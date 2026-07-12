"use client";

/**
 * ExpenseList Component
 * 
 * Displays a list of expenses per vehicle with filtering.
 * 
 * Requirements: 8.3
 */

import { Expense, Vehicle } from "@/domain/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ExpenseListProps {
  expenses: Expense[];
  vehicles: Vehicle[];
}

const CATEGORY_COLORS: Record<string, string> = {
  toll: "bg-green-100 text-green-800 hover:bg-green-100",
  "maintenance charge": "bg-orange-100 text-orange-800 hover:bg-orange-100",
  other: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

const CATEGORY_LABELS: Record<string, string> = {
  toll: "Toll",
  "maintenance charge": "Maintenance Charge",
  other: "Other",
};

export function ExpenseList({ expenses, vehicles }: ExpenseListProps) {
  // Create a map of vehicle IDs to registration numbers for quick lookup
  const vehicleMap = new Map(
    vehicles.map((v) => [v.id, v.registrationNumber])
  );

  // Sort expenses by date descending (most recent first)
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate totals
  const totalCost = expenses.reduce((sum, expense) => sum + expense.cost, 0);
  
  // Calculate totals by category
  const categoryTotals = expenses.reduce(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.cost;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      {expenses.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="space-y-3">
            <div>
              <p className="text-gray-600 text-sm">Total Expenses</p>
              <p className="text-2xl font-semibold text-purple-900">
                ₹
                {totalCost.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            
            {Object.keys(categoryTotals).length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-200">
                {Object.entries(categoryTotals).map(([category, cost]) => (
                  <div key={category} className="text-sm">
                    <p className="text-gray-600 capitalize">
                      {CATEGORY_LABELS[category] || category}
                    </p>
                    <p className="font-medium text-purple-900">
                      ₹{cost.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                  No expenses found
                </TableCell>
              </TableRow>
            ) : (
              sortedExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {new Date(expense.date).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {vehicleMap.get(expense.vehicleId) || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge className={CATEGORY_COLORS[expense.category] || ""}>
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ₹
                    {expense.cost.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {expenses.length > 0 && (
        <p className="text-sm text-gray-600">
          Showing {sortedExpenses.length} expense{sortedExpenses.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
