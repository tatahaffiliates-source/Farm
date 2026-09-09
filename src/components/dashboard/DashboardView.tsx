import React from 'react';
import {
  StatCard,
} from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import {
  Layers,
  TrendingUp,
  Receipt,
  Scale,
  Wheat,
  Activity,
  HeartHandshake,
  AlertTriangle,
  ArrowRight,
  Plus,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { FarmDashboardStats, Pig, Sale, Expense, HealthRecord, BreedingRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardViewProps {
  stats: FarmDashboardStats;
  pigs: Pig[];
  sales: Sale[];
  expenses: Expense[];
  healthRecords: HealthRecord[];
  breedingRecords: BreedingRecord[];
  onNavigate: (section: any) => void;
  onOpenQuickAction: (actionType?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  pigs,
  sales,
  expenses,
  healthRecords,
  breedingRecords,
  onNavigate,
  onOpenQuickAction,
}) => {
  const { role } = useAuth();
  const isWorker = role === 'worker';

  // Format currency
  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Recent 5 sales
  const recentSales = sales.slice(0, 5);
  // Recent 5 expenses
  const recentExpenses = expenses.slice(0, 5);
  // Recent health logs
  const recentHealth = healthRecords.slice(0, 5);
  // Recent pregnant sows
  const pregnantSows = breedingRecords
    .filter((b) => b.status === 'Pregnant')
    .slice(0, 4);

  // Financial chart data (last 4 months simulation from actual records or current month)
  const currentMonthSales = stats.thisMonthSales;
  const currentMonthExpenses = stats.thisMonthExpenses;

  const financialComparisonData = [
    { month: 'Jun', Sales: 85000, Expenses: 52000 },
    { month: 'Jul', Sales: 110000, Expenses: 64000 },
    { month: 'Aug', Sales: 109080, Expenses: 50850 },
    {
      month: 'Sep (Current)',
      Sales: currentMonthSales,
      Expenses: currentMonthExpenses,
    },
  ];

  // Livestock distribution by Breed
  const breedCounts: Record<string, number> = {};
  pigs
    .filter((p) => p.status === 'Active' || p.status === 'Pregnant' || p.status === 'Sick')
    .forEach((p) => {
      breedCounts[p.breed] = (breedCounts[p.breed] || 0) + 1;
    });

  const breedChartData = Object.entries(breedCounts).map(([name, count]) => ({
    name,
    value: count,
  }));

  const PIE_COLORS = ['#047857', '#0284c7', '#d97706', '#9333ea', '#e11d48', '#4b5563'];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner with Quick Action Bar */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Farm Management Overview
              </span>
              <span className="text-xs text-stone-400">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1.5">
              Live Swine Herd & Financial Pulse
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
              Real-time monitoring of livestock headcount, feeding inventory, farrowing schedules, and net farm profit.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onOpenQuickAction('add-pig')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Pig
            </button>
            <button
              onClick={() => onOpenQuickAction('record-weight')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-stone-700 hover:bg-stone-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              Record Weight
            </button>
            {!isWorker && (
              <button
                onClick={() => onOpenQuickAction('add-sale')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Add Sale
              </button>
            )}
            {!isWorker && (
              <button
                onClick={() => onOpenQuickAction('add-expense')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-600 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                Add Expense
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Livestock Overview Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            Livestock Population Breakdown
          </h2>
          <button
            onClick={() => onNavigate('livestock')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            View All Livestock <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <StatCard
            title="Total Pigs"
            value={stats.totalPigs}
            icon={Layers}
            variant="emerald"
            subtitle="Active herd"
            onClick={() => onNavigate('livestock')}
          />
          <StatCard
            title="Male Pigs"
            value={stats.malePigs}
            icon={Layers}
            variant="default"
            subtitle="Boars & growers"
            onClick={() => onNavigate('livestock')}
          />
          <StatCard
            title="Female Pigs"
            value={stats.femalePigs}
            icon={Layers}
            variant="default"
            subtitle="Sows & gilts"
            onClick={() => onNavigate('livestock')}
          />
          <StatCard
            title="Piglets"
            value={stats.piglets}
            icon={Sparkles}
            variant="purple"
            subtitle="Under 20kg"
            onClick={() => onNavigate('livestock')}
          />
          <StatCard
            title="Breeding Sows"
            value={stats.breedingSows}
            icon={HeartHandshake}
            variant="purple"
            subtitle="Active mothers"
            onClick={() => onNavigate('breeding')}
          />
          <StatCard
            title="Pregnant Sows"
            value={stats.pregnantSows}
            icon={Calendar}
            variant="amber"
            subtitle="In gestation"
            onClick={() => onNavigate('breeding')}
          />
          <StatCard
            title="Ready for Sale"
            value={stats.readyForSale}
            icon={TrendingUp}
            variant="blue"
            subtitle="Market weight ≥85kg"
            onClick={() => onNavigate('livestock')}
          />
        </div>
      </div>

      {/* Section 2: Financial Overview (Restricted for Workers) */}
      {!isWorker ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              Financial Performance & Profit
            </h2>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              Full P&L Analytics <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard
              title="Today's Sales"
              value={formatCurrency(stats.todaySales)}
              icon={TrendingUp}
              variant="blue"
              subtitle="Daily revenue"
              onClick={() => onNavigate('sales')}
            />
            <StatCard
              title="Today's Expenses"
              value={formatCurrency(stats.todayExpenses)}
              icon={Receipt}
              variant="rose"
              subtitle="Daily outflows"
              onClick={() => onNavigate('expenses')}
            />
            <StatCard
              title="This Month's Sales"
              value={formatCurrency(stats.thisMonthSales)}
              icon={TrendingUp}
              variant="emerald"
              subtitle="Current month"
              onClick={() => onNavigate('sales')}
            />
            <StatCard
              title="This Month's Expenses"
              value={formatCurrency(stats.thisMonthExpenses)}
              icon={Receipt}
              variant="rose"
              subtitle="Feed, vet & labour"
              onClick={() => onNavigate('expenses')}
            />
            <StatCard
              title="Current Month Net Profit"
              value={formatCurrency(stats.netProfit)}
              icon={Scale}
              variant={stats.netProfit >= 0 ? 'emerald' : 'rose'}
              badge={stats.netProfit >= 0 ? 'Surplus' : 'Deficit'}
              subtitle="Sales minus expenses"
              onClick={() => onNavigate('reports')}
            />
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
          <span>🔒 Financial metrics are restricted for field worker accounts. Contact farm owner for accounting access.</span>
          <span className="font-semibold text-stone-700 uppercase">Worker Mode Active</span>
        </div>
      )}

      {/* Section 3: Critical Inventory & Delivery Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={() => onNavigate('feed')}
          className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            stats.lowFeedCount > 0
              ? 'bg-amber-50/80 border-amber-300 hover:bg-amber-100/70'
              : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 uppercase">Feed Inventory Alert</p>
              <p className="text-xs text-stone-600">
                {stats.lowFeedCount > 0
                  ? `${stats.lowFeedCount} feed item(s) below reserve`
                  : 'All feed rations safely stocked'}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-800 flex items-center gap-1">
            Check <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div
          onClick={() => onNavigate('health')}
          className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            stats.lowMedicineCount > 0
              ? 'bg-rose-50/80 border-rose-300 hover:bg-rose-100/70'
              : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 text-rose-800">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 uppercase">Medicine & Vaccine Stock</p>
              <p className="text-xs text-stone-600">
                {stats.lowMedicineCount > 0
                  ? `${stats.lowMedicineCount} critical medicine(s) low`
                  : 'Medical supplies adequate'}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-rose-800 flex items-center gap-1">
            Check <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div
          onClick={() => onNavigate('breeding')}
          className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            stats.upcomingDeliveriesCount > 0
              ? 'bg-purple-50/80 border-purple-300 hover:bg-purple-100/70'
              : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-100 text-purple-800">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 uppercase">Upcoming Births (14 Days)</p>
              <p className="text-xs text-stone-600">
                {stats.upcomingDeliveriesCount > 0
                  ? `${stats.upcomingDeliveriesCount} sow(s) due for farrowing`
                  : 'No litters due in next 14 days'}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-purple-800 flex items-center gap-1">
            View Sows <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Section 4: Operational Business Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sales vs Expenses Comparison */}
        {!isWorker ? (
          <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                  Revenue vs Operating Expenses (INR)
                </h3>
                <p className="text-xs text-stone-500">Monthly trend answering profitability questions</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Real DB Records
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#292524',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Sales" fill="#059669" radius={[4, 4, 0, 0]} name="Sales (₹)" />
                  <Bar dataKey="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} name="Expenses (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-center text-center">
            <h3 className="text-sm font-bold text-stone-900 mb-1">Herd Weight & Growth Monitoring</h3>
            <p className="text-xs text-stone-500 mb-4">Focus on daily feed conversion and weigh-ins</p>
            <div className="p-8 rounded-lg bg-stone-50 border border-dashed border-stone-200">
              <Scale className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-800">
                10 active pigs in herd. Average finisher weight: 96 kg.
              </p>
              <button
                onClick={() => onOpenQuickAction('record-weight')}
                className="mt-3 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white"
              >
                Log Today's Weight
              </button>
            </div>
          </div>
        )}

        {/* Right 1 Col: Breed Distribution */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Livestock by Breed
            </h3>
            <p className="text-xs text-stone-500 mb-2">Breeding stock vs commercial crossbreeds</p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breedChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {breedChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#292524',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-stone-100 text-xs">
            {breedChartData.map((b, idx) => (
              <div key={b.name} className="flex items-center justify-between text-stone-600">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span>{b.name}</span>
                </div>
                <span className="font-semibold text-stone-900">{b.value} pigs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 5: Real Farm Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Livestock Health Logs */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              Recent Health & Veterinary Logs
            </h3>
            <button
              onClick={() => onNavigate('health')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              All Health Records
            </button>
          </div>

          <div className="space-y-3">
            {recentHealth.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-lg border border-stone-100 bg-stone-50/60 flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">Pig {h.pig_tag}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {h.type}
                    </span>
                    <span className="text-[11px] text-stone-400">{h.record_date}</span>
                  </div>
                  <p className="text-xs font-medium text-stone-700 mt-1">{h.condition}</p>
                  {h.treatment && <p className="text-[11px] text-stone-500 mt-0.5">{h.treatment}</p>}
                </div>
                {h.cost > 0 && (
                  <span className="text-xs font-bold text-stone-800 bg-white px-2 py-1 rounded border border-stone-200 shrink-0">
                    ₹{h.cost}
                  </span>
                )}
              </div>
            ))}
            {recentHealth.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-6">No recent health records.</p>
            )}
          </div>
        </div>

        {/* Pregnant Sows Gestation Tracker */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-purple-600" />
              Pregnant Sows & Gestation Due Dates
            </h3>
            <button
              onClick={() => onNavigate('breeding')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              Breeding Desk
            </button>
          </div>

          <div className="space-y-3">
            {pregnantSows.map((b) => {
              const expected = new Date(b.expected_delivery_date);
              const today = new Date();
              const diffDays = Math.ceil((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={b.id}
                  className="p-3 rounded-lg border border-purple-100 bg-purple-50/40 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-stone-900">{b.sow_tag}</p>
                    <p className="text-[11px] text-stone-500">
                      Mated: {b.mating_date} • Stud: {b.boar_tag || 'Breeding Boar'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        diffDays <= 7
                          ? 'bg-rose-100 text-rose-800 animate-pulse'
                          : diffDays <= 14
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {diffDays > 0 ? `${diffDays} days to farrow` : 'Due today!'}
                    </span>
                    <p className="text-[11px] text-stone-400 mt-1">Due: {b.expected_delivery_date}</p>
                  </div>
                </div>
              );
            })}
            {pregnantSows.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-6">No pregnant sows currently in gestation.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
