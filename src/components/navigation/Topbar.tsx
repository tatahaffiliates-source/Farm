import React, { useState } from 'react';
import { Menu, Plus, Bell, AlertTriangle, Calendar, Layers, Shield } from 'lucide-react';
import { NavSection } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { FarmDashboardStats } from '../../types';

interface TopbarProps {
  currentSection: NavSection;
  stats: FarmDashboardStats;
  onOpenQuickAction: (actionType?: string) => void;
  onToggleMobileNav: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentSection,
  stats,
  onOpenQuickAction,
  onToggleMobileNav,
}) => {
  const { role } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const sectionTitles: Record<NavSection, { title: string; desc: string }> = {
    dashboard: { title: 'Farm Operations Dashboard', desc: 'Real-time herd count, financials, and inventory alerts' },
    livestock: { title: 'Livestock Register', desc: 'Individual pig IDs, breeding status, pen locations, and weights' },
    breeding: { title: 'Breeding & Birth Records', desc: 'Sow mating schedules, 114-day gestation tracking, and piglet litters' },
    health: { title: 'Veterinary & Health Logs', desc: 'Vaccinations, deworming cycles, treatments, and medical inventory' },
    feed: { title: 'Feed & Farm Inventory', desc: 'Feed inventory, daily usage rations, purchases, and supply tracking' },
    sales: { title: 'Livestock Sales & Customers', desc: 'Live weight sales, price per kg, invoice records, and payments' },
    expenses: { title: 'Operating Expenses', desc: 'Feed, veterinary, labour, utilities, and farm maintenance costs' },
    customers: { title: 'Customer Directory', desc: 'Wholesale buyers, meat shops, contacts, and order histories' },
    reports: { title: 'Executive Analytics & Reports', desc: 'Exportable CSV reports for livestock, revenue, expenses, and herd health' },
    users: { title: 'Team & Role Permissions', desc: 'Manage access control: Admin, Manager, and Field Worker' },
    settings: { title: 'Farm Settings & Database', desc: 'Farm configuration, currency, units, and Supabase SQL migrations' },
  };

  const totalAlerts = stats.lowFeedCount + stats.lowMedicineCount + stats.upcomingDeliveriesCount;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-stone-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight leading-tight">
            {sectionTitles[currentSection]?.title || 'Farm Management'}
          </h2>
          <p className="hidden sm:block text-xs text-stone-500">
            {sectionTitles[currentSection]?.desc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Record Action Button */}
        <button
          type="button"
          onClick={() => onOpenQuickAction()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Quick Action</span>
          <span className="sm:hidden">Action</span>
        </button>

        {/* Notifications & Low Stock Alerts */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            title="Farm Alerts"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-stone-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2.5">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">Alerts & Reminders</span>
                <span className="text-[11px] text-stone-400 font-medium">{totalAlerts} active</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {stats.lowFeedCount > 0 && (
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-900">Low Feed Stock Alert</p>
                      <p className="text-[11px] text-amber-700">
                        {stats.lowFeedCount} feed item(s) below minimum safety reserve.
                      </p>
                    </div>
                  </div>
                )}

                {stats.lowMedicineCount > 0 && (
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-rose-900">Critical Medicine Stock</p>
                      <p className="text-[11px] text-rose-700">
                        {stats.lowMedicineCount} medicine item(s) require reordering.
                      </p>
                    </div>
                  </div>
                )}

                {stats.upcomingDeliveriesCount > 0 && (
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-purple-50 border border-purple-200">
                    <Calendar className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-purple-900">Upcoming Farrowing (Births)</p>
                      <p className="text-[11px] text-purple-700">
                        {stats.upcomingDeliveriesCount} pregnant sow(s) due within 14 days.
                      </p>
                    </div>
                  </div>
                )}

                {totalAlerts === 0 && (
                  <p className="text-xs text-stone-500 text-center py-4">No critical alerts at this time.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
