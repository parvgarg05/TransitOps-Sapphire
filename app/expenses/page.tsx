/**
 * Fuel and Expense Management Page
 *
 * Main page for recording fuel logs and expenses, viewing operational costs,
 * and filtering records by vehicle/date range.
 *
 * Requirements: 8.1, 8.3, 8.5
 */

import { ExpenseManagement } from "@/components/expenses/ExpenseManagement";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ExpensesPage() {
  return (
    <div className="mx-auto max-w-content px-4 sm:px-6 py-8">
      <PageHeader
        title="Fuel & Expense Management"
        description="Record fuel logs and expenses, track operational costs per vehicle."
      />
      <ExpenseManagement />
    </div>
  );
}
