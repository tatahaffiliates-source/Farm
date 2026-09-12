import React, { useState } from 'react';
import { FeedItem, FeedPurchase, GeneralInventoryItem } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { SearchBar } from '../common/SearchBar';
import { EmptyState } from '../common/EmptyState';
import { FeedPurchaseModal } from './FeedPurchaseModal';
import { FeedUsageModal } from './FeedUsageModal';
import { AddInventoryModal } from './AddInventoryModal';
import { Wheat, ShoppingCart, Utensils, AlertTriangle, Plus, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FeedViewProps {
  feedItems: FeedItem[];
  feedPurchases: FeedPurchase[];
  generalInventory: GeneralInventoryItem[];
  onRefresh: () => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  feedItems,
  feedPurchases,
  generalInventory,
  onRefresh,
}) => {
  const { role } = useAuth();
  const isWorker = role === 'worker';

  const [activeSubTab, setActiveSubTab] = useState<'rations' | 'purchases' | 'supplies'>('rations');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isAddInventoryModalOpen, setIsAddInventoryModalOpen] = useState(false);

  // Total stock in kg
  const totalKgStock = feedItems.reduce(
    (sum, f) => sum + (f.unit === 'kg' ? f.current_stock ?? 0 : (f.current_stock ?? 0) * 50),
    0
  );
  // Low feed items
  const lowFeedItems = feedItems.filter((f) => (f.current_stock ?? 0) <= (f.min_stock_level ?? 0));
  // Total purchase outlay this month
  const totalPurchaseSpend = feedPurchases.reduce((sum, p) => sum + (p.total_amount ?? p.cost ?? 0), 0);

  // Filters
  const filteredFeeds = feedItems.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.type ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPurchases = feedPurchases.filter((p) =>
    (p.feed_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.supplier ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.invoice_number && p.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSupplies = generalInventory.filter((s) =>
    (s.name ?? s.item_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Feed & Farm Inventory Management"
        description="Monitor swine feed inventory, record daily feeding rations, and track feed bulk purchasing expenses"
        badge={`${feedItems.length} Rations Stocked`}
        action={{
          label: 'Record Feed Usage',
          icon: Utensils,
          onClick: () => setIsUsageModalOpen(true),
        }}
        secondaryAction={
          !isWorker
            ? {
                label: 'Purchase Feed Bulk',
                icon: ShoppingCart,
                onClick: () => setIsPurchaseModalOpen(true),
              }
            : undefined
        }
      >
        {!isWorker && (
          <button
            type="button"
            onClick={() => setIsAddInventoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Item / Diet
          </button>
        )}
      </PageHeader>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Feed on Hand"
          value={`${totalKgStock.toLocaleString('en-IN')} kg`}
          icon={Wheat}
          variant="emerald"
          subtitle="Combined diets"
        />
        <StatCard
          title="Low Stock Warning"
          value={lowFeedItems.length}
          icon={AlertTriangle}
          variant={lowFeedItems.length > 0 ? 'amber' : 'default'}
          subtitle={lowFeedItems.length > 0 ? 'Reorder immediately' : 'Safety reserves safe'}
        />
        <StatCard
          title="General Supplies"
          value={generalInventory.length}
          icon={Package}
          variant="blue"
          subtitle="Tools & farm items"
        />
        {!isWorker ? (
          <StatCard
            title="Total Feed Purchases"
            value={`₹${totalPurchaseSpend.toLocaleString('en-IN')}`}
            icon={ShoppingCart}
            variant="purple"
            subtitle="Recorded feed outlay"
          />
        ) : (
          <StatCard
            title="Feed Formulations"
            value={feedItems.length}
            icon={Wheat}
            variant="default"
            subtitle="Active ration diets"
          />
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('rations')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeSubTab === 'rations'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Wheat className="w-4 h-4" />
          Feed Rations & Stocks ({feedItems.length})
        </button>
        {!isWorker && (
          <button
            type="button"
            onClick={() => setActiveSubTab('purchases')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
              activeSubTab === 'purchases'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Purchase Ledger ({feedPurchases.length})
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveSubTab('supplies')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeSubTab === 'supplies'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Package className="w-4 h-4" />
          General Farm Supplies ({generalInventory.length})
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search feed, supplier, or supply item..."
        />
      </div>

      {/* Tab 1: Feed Rations Table */}
      {activeSubTab === 'rations' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          {filteredFeeds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Feed Formulation</th>
                    <th className="py-3 px-4">Growth Stage / Type</th>
                    <th className="py-3 px-4 font-mono">Available Stock</th>
                    <th className="py-3 px-4 font-mono">Min Reserve</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Cost / kg</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredFeeds.map((feed) => {
                    const isLow = (feed.current_stock ?? 0) <= (feed.min_stock_level ?? 0);
                    return (
                      <tr key={feed.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-stone-900">{feed.name}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                            {feed.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          {(feed.current_stock ?? 0).toLocaleString('en-IN')} {feed.unit}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-500">
                          {(feed.min_stock_level ?? 0).toLocaleString('en-IN')} {feed.unit}
                        </td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Adequate
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-700">₹{feed.cost_per_unit}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setIsUsageModalOpen(true)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 cursor-pointer"
                            >
                              Feed
                            </button>
                            {!isWorker && (
                              <button
                                type="button"
                                onClick={() => setIsPurchaseModalOpen(true)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                              >
                                Restock
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
              icon={Wheat}
              title="No feed rations found"
              description="Register your starter, grower, finisher, and lactation feeds."
              action={{
                label: 'Add Feed Diet',
                onClick: () => setIsAddInventoryModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* Tab 2: Purchase Ledger */}
      {activeSubTab === 'purchases' && !isWorker && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          {filteredPurchases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Feed Item</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Rate / kg</th>
                    <th className="py-3 px-4 text-right">Total Outlay</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Invoice #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-600">{purchase.purchase_date ?? purchase.date}</td>
                      <td className="py-3 px-4 font-bold text-stone-900">{purchase.feed_name ?? 'Feed'}</td>
                      <td className="py-3 px-4 text-stone-700 font-medium">{purchase.supplier ?? '-'}</td>
                      <td className="py-3 px-4 font-mono">
                        {purchase.quantity} {purchase.unit ?? 'kg'}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600">₹{purchase.unit_price ?? purchase.cost}</td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 text-right">
                        ₹{(purchase.total_amount ?? purchase.cost).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-stone-600">{purchase.payment_method ?? '-'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-stone-500">
                        {purchase.invoice_number || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={ShoppingCart}
              title="No feed purchases recorded"
              description="Record bulk feed procurement to automatically track inventory and expenses."
              action={{
                label: 'Record Feed Purchase',
                onClick: () => setIsPurchaseModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* Tab 3: General Farm Supplies */}
      {activeSubTab === 'supplies' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          {filteredSupplies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Quantity Available</th>
                    <th className="py-3 px-4">Min Stock</th>
                    <th className="py-3 px-4">Storage Location</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredSupplies.map((item) => {
                    const isLow = item.quantity <= (item.min_stock_level ?? 0);
                    return (
                      <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-stone-900">{item.name}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-500">
                          {item.min_stock_level} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-stone-600">{item.location}</td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Stocked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="No general supplies listed"
              description="Keep track of sanitation lime, disinfectants, heating lamps, and farm tools."
              action={{
                label: 'Add Supply Item',
                onClick: () => setIsAddInventoryModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <FeedPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        feedItems={feedItems}
        onSuccess={onRefresh}
      />

      <FeedUsageModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        feedItems={feedItems}
        onSuccess={onRefresh}
      />

      <AddInventoryModal
        isOpen={isAddInventoryModalOpen}
        onClose={() => setIsAddInventoryModalOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
