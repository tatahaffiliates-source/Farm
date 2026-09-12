import React, { useState } from 'react';
import { Customer, Sale } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { SearchBar } from '../common/SearchBar';
import { EmptyState } from '../common/EmptyState';
import { AddCustomerModal } from './AddCustomerModal';
import { Users, Phone, MapPin, Plus, Store, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CustomersViewProps {
  customers: Customer[];
  sales: Sale[];
  onRefresh: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  sales,
  onRefresh,
}) => {
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Compute stats for each customer from real sales
  const customerSalesMap: Record<string, { count: number; total: number }> = {};
  sales.forEach((s) => {
    if (!customerSalesMap[s.customer_id]) {
      customerSalesMap[s.customer_id] = { count: 0, total: 0 };
    }
    customerSalesMap[s.customer_id].count += 1;
    customerSalesMap[s.customer_id].total += s.total_amount;
  });

  const wholesaleCount = customers.filter((c) => c.type === 'Wholesale Buyer').length;
  const retailCount = customers.filter((c) => c.type === 'Retail Butcher' || c.type === 'Butcher').length;
  const totalVolume = sales.reduce((sum, s) => sum + s.total_amount, 0);

  const filteredCustomers = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Customer & Buyer Directory"
        description="Maintain verified contacts for wholesale livestock traders, pork butchers, and farm gate buyers"
        badge={`${customers.length} Buyers`}
        action={{
          label: 'Add Customer',
          icon: Plus,
          onClick: () => setIsAddModalOpen(true),
        }}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Registered Buyers"
          value={customers.length}
          icon={Users}
          variant="emerald"
          subtitle="Customer accounts"
        />
        <StatCard
          title="Wholesale Livestock Traders"
          value={wholesaleCount}
          icon={Store}
          variant="blue"
          subtitle="Bulk buyers"
        />
        <StatCard
          title="Retail Butchers / Shops"
          value={retailCount}
          icon={ShoppingBag}
          variant="purple"
          subtitle="Direct meat distributors"
        />
        <StatCard
          title="Lifetime Sales Volume"
          value={`₹${totalVolume.toLocaleString('en-IN')}`}
          icon={Users}
          variant="default"
          subtitle="From registered buyers"
        />
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search buyer name, contact phone, or market address..."
        />
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
        {filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Customer / Business Name</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Market Address</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-right">Lifetime Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map((cust) => {
                  const spend = customerSalesMap[cust.id]?.total || 0;
                  const orderCount = customerSalesMap[cust.id]?.count || 0;

                  return (
                    <tr key={cust.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-stone-900">{cust.name}</p>
                        {cust.notes && <p className="text-[11px] text-stone-400 mt-0.5">{cust.notes}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                          {cust.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-700">
                        {cust.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            {cust.phone}
                          </span>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {cust.address ? (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            {cust.address}
                          </span>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-stone-800">
                        {orderCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono">
                            {orderCount}
                          </span>
                        ) : (
                          <span className="text-stone-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 text-right">
                        ₹{spend.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No buyers registered"
            description="Add meat merchants and pork butcher shops to streamline sale invoices."
            action={{
              label: 'Add Customer',
              onClick: () => setIsAddModalOpen(true),
            }}
          />
        )}
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
