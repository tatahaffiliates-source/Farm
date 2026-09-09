import React, { useState } from 'react';
import { Sale, Customer, Pig } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { SearchBar } from '../common/SearchBar';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { RecordSaleModal } from './RecordSaleModal';
import { TrendingUp, Users, Scale, IndianRupee, Plus, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SalesViewProps {
  sales: Sale[];
  customers: Customer[];
  pigs: Pig[];
  onRefresh: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({ sales, customers, pigs, onRefresh }) => {
  const { role } = useAuth();
  const isWorker = role === 'worker';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isRecordSaleModalOpen, setIsRecordSaleModalOpen] = useState(false);

  // Financial aggregates
  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalWeightSold = sales.reduce((sum, s) => sum + s.weight, 0);
  const avgRatePerKg = totalWeightSold > 0 ? (totalRevenue / totalWeightSold).toFixed(1) : '0';
  const pendingAmount = sales
    .filter((s) => s.payment_status === 'Pending' || s.payment_status === 'Partial')
    .reduce((sum, s) => sum + s.total_amount, 0);

  // Filters
  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.pig_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatus === 'All' || s.payment_status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Livestock Sales & Invoices"
        description="Live market weight animal sales, customer order ledgers, and payment receipt tracking"
        badge={`${sales.length} Sales Invoiced`}
        action={
          !isWorker
            ? {
                label: 'Record Livestock Sale',
                icon: Plus,
                onClick: () => setIsRecordSaleModalOpen(true),
              }
            : undefined
        }
      />

      {/* Sales Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Gross Revenue"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          variant="emerald"
          subtitle="Cumulative sales"
        />
        <StatCard
          title="Pigs Sold to Date"
          value={sales.length}
          icon={Scale}
          variant="blue"
          subtitle={`${totalWeightSold} kg total biomass`}
        />
        <StatCard
          title="Average Realized Rate"
          value={`₹${avgRatePerKg} / kg`}
          icon={IndianRupee}
          variant="purple"
          subtitle="Live weight market price"
        />
        <StatCard
          title="Pending Receivables"
          value={`₹${pendingAmount.toLocaleString('en-IN')}`}
          icon={FileText}
          variant={pendingAmount > 0 ? 'amber' : 'default'}
          subtitle="Uncollected payments"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by buyer name, pig ID, or notes..."
        />

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs font-medium px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-700 cursor-pointer w-full sm:w-auto"
        >
          <option value="All">All Payment Statuses</option>
          <option value="Paid">Fully Paid</option>
          <option value="Partial">Partial Payment</option>
          <option value="Pending">Pending Payment</option>
        </select>
      </div>

      {/* Sales Data Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
        {filteredSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Buyer / Customer</th>
                  <th className="py-3 px-4">Sold Animal</th>
                  <th className="py-3 px-4">Live Weight</th>
                  <th className="py-3 px-4">Rate / kg</th>
                  <th className="py-3 px-4 text-right">Invoice Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-600">{sale.sale_date}</td>
                    <td className="py-3 px-4 font-bold text-stone-900">{sale.customer_name}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {sale.pig_tag}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">{sale.weight} kg</td>
                    <td className="py-3 px-4 font-mono text-stone-600">₹{sale.price_per_kg}</td>
                    <td className="py-3 px-4 font-mono font-bold text-stone-900 text-right text-sm">
                      ₹{sale.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-stone-600">{sale.payment_method}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={sale.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No sales transactions found"
            description="Record pig live weight market sales to customers and generate invoices."
            action={
              !isWorker
                ? {
                    label: 'Record Livestock Sale',
                    onClick: () => setIsRecordSaleModalOpen(true),
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* Sale Modal */}
      <RecordSaleModal
        isOpen={isRecordSaleModalOpen}
        onClose={() => setIsRecordSaleModalOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
