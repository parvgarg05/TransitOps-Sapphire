/**
 * Fuel and Expense Management Page
 * 
 * Main page for recording fuel logs and expenses, viewing operational costs,
 * and filtering records by vehicle/date range.
 * 
 * Requirements: 8.1, 8.3, 8.5
 */

import { ExpenseManagement } from "@/components/expenses/ExpenseManagement";

export default function ExpensesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fuel & Expense Management</h1>
        <p className="text-gray-600">
          Record fuel logs and expenses, track operational costs per vehicle
        </p>
      </div>
      <ExpenseManagement />
    </div>
  );
}
