import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { SearchBar } from '../common/SearchBar';
import { EmptyState } from '../common/EmptyState';
import { RecordExpenseModal } from './RecordExpenseModal';
import { Receipt, Wheat, HardHat, Activity, Plus, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ExpensesViewProps {
  expenses: Expense[];
  onRefresh: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, onRefresh }) => {
  const { role } = useAuth();
  const isWorker = role === 'worker';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isRecordExpenseModalOpen, setIsRecordExpenseModalOpen] = useState(false);

  // Financial aggregates
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const feedExpenses = expenses
    .filter((e) => e.category === 'Feed')
    .reduce((sum, e) => sum + e.amount, 0);

  const labourExpenses = expenses
    .filter((e) => e.category === 'Labour')
    .reduce((sum, e) => sum + e.amount, 0);

  const healthExpenses = expenses
    .filter((e) => e.category === 'Medicine' || e.category === 'Vaccination' || e.category === 'Veterinary')
    .reduce((sum, e) => sum + e.amount, 0);

  // Filters
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.payee && e.payee.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.receipt_number && e.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Farm Operating Expenses"
        description="Detailed ledger of swine feed procurement, wages, medicine, electricity, and maintenance outflows"
        badge={`${expenses.length} Expenses Recorded`}
        action={
          !isWorker
            ? {
                label: 'Record New Expense',
                icon: Plus,
                onClick: () => setIsRecordExpenseModalOpen(true),
              }
            : undefined
        }
      />

      {/* Expense KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Farm Expenses"
          value={`$${totalExpenses.toLocaleString('en-US')}`}
          icon={Receipt}
          variant="rose"
          subtitle="Cumulative outflows"
        />
        <StatCard
          title="Feed Procurement"
          value={`$${feedExpenses.toLocaleString('en-US')}`}
          icon={Wheat}
          variant="amber"
          subtitle={`${totalExpenses > 0 ? ((feedExpenses / totalExpenses) * 100).toFixed(0) : 0}% of farm costs`}
        />
        <StatCard
          title="Labour & Wages"
          value={`$${labourExpenses.toLocaleString('en-US')}`}
          icon={HardHat}
          variant="blue"
          subtitle="Staff payroll"
        />
        <StatCard
          title="Vet, Meds & Vaccines"
          value={`$${healthExpenses.toLocaleString('en-US')}`}
          icon={Activity}
          variant="emerald"
          subtitle="Biosecurity & care"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by description, vendor, or receipt #..."
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-medium px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-700 cursor-pointer w-full sm:w-auto"
        >
          <option value="All">All Expense Categories</option>
          <option value="Feed">Feed Rations</option>
          <option value="Medicine">Medicine</option>
          <option value="Vaccination">Vaccination</option>
          <option value="Labour">Labour & Wages</option>
          <option value="Electricity">Electricity</option>
          <option value="Water">Water</option>
          <option value="Transportation">Transportation</option>
          <option value="Equipment">Equipment</option>
          <option value="Repairs">Repairs & Pens</option>
          <option value="Veterinary">Veterinary Fees</option>
          <option value="Pig purchase">Pig Purchases</option>
          <option value="Maintenance">Maintenance & Sanitation</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
        {filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Payee / Vendor</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 font-mono">Receipt #</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-600">{expense.expense_date}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-900">{expense.description}</td>
                    <td className="py-3 px-4 text-stone-600">{expense.payee || '-'}</td>
                    <td className="py-3 px-4 text-stone-600">{expense.payment_method}</td>
                    <td className="py-3 px-4 font-mono text-xs text-stone-500">
                      {expense.receipt_number || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-700 text-right text-sm">
                      ${expense.amount.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No expenses recorded"
            description="Log operating costs to accurately track net profit across feed, labor, and healthcare."
            action={
              !isWorker
                ? {
                    label: 'Record New Expense',
                    onClick: () => setIsRecordExpenseModalOpen(true),
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* Record Expense Modal */}
      <RecordExpenseModal
        isOpen={isRecordExpenseModalOpen}
        onClose={() => setIsRecordExpenseModalOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
