import React, { useState } from 'react';
import { Customer, Sale } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { SearchBar } from '../common/SearchBar';
import { EmptyState } from '../common/EmptyState';
import { AddCustomerModal } from './AddCustomerModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Users, Phone, MapPin, Plus, Store, ShoppingBag, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

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
  const { success, error } = useToast();
  const isWorker = role === 'worker';
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await db.deleteCustomer(customerToDelete.id);
      success(`Customer "${customerToDelete.name}" removed from directory.`);
      setCustomerToDelete(null);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Could not delete customer.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute stats for each customer from real sales
  const customerSalesMap: Record<string, { count: number; total: number }> = {};
  sales.forEach((s) => {
    const customerId = s.customer_id;
    if (!customerId) return;
    if (!customerSalesMap[customerId]) {
      customerSalesMap[customerId] = { count: 0, total: 0 };
    }
    customerSalesMap[customerId].count += 1;
    customerSalesMap[customerId].total += s.total_amount;
  });

  const wholesaleCount = customers.filter((c) => c.type === 'Wholesale Buyer').length;
  const retailCount = customers.filter((c) => c.type === 'Retail Butcher' || c.type === 'Butcher').length;
  const totalVolume = sales.reduce((sum, s) => sum + s.total_amount, 0);

  const filteredCustomers = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.type && c.type.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Customer & Buyer Directory"
        description="Maintain verified contacts for wholesale livestock traders, pork butchers, and farm gate buyers"
        badge={`${customers.length} Buyers`}
        action={
          !isWorker
            ? {
                label: 'Add Customer',
                icon: Plus,
                onClick: () => {
                  setEditingCustomer(null);
                  setIsAddModalOpen(true);
                },
              }
            : undefined
        }
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
          value={`$${totalVolume.toLocaleString('en-US')}`}
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
                  <th className="py-3 px-4 text-right">Actions</th>
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
                        ${spend.toLocaleString('en-US')}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isWorker && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCustomer(cust);
                                setIsAddModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Edit Customer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => setCustomerToDelete(cust)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
            action={
              !isWorker
                ? {
                    label: 'Add Customer',
                    onClick: () => {
                      setEditingCustomer(null);
                      setIsAddModalOpen(true);
                    },
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCustomer(null);
        }}
        customerToEdit={editingCustomer}
        onSuccess={onRefresh}
      />

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleDeleteCustomer}
        title={`Remove ${customerToDelete?.name} from directory?`}
        message={`This permanently deletes the buyer record for ${customerToDelete?.name}. Customers with recorded sales cannot be deleted.`}
        confirmLabel="Delete Customer"
        isLoading={isDeleting}
        isDestructive
      />
    </div>
  );
};
