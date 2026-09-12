import React, { useState } from 'react';
import { Pig, BreedingRecord, BirthRecord, FeedItem, FeedPurchase, Sale, Expense } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { BarChart3, TrendingUp, Download, PieChart, IndianRupee, Wheat, Baby, Activity } from 'lucide-react';
import { useToast } from '../common/Toast';

interface ReportsViewProps {
  pigs: Pig[];
  breedingRecords: BreedingRecord[];
  birthRecords: BirthRecord[];
  feedItems: FeedItem[];
  feedPurchases: FeedPurchase[];
  sales: Sale[];
  expenses: Expense[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  pigs,
  breedingRecords,
  birthRecords,
  feedItems,
  feedPurchases,
  sales,
  expenses,
}) => {
  const { success } = useToast();
  const [activeReportTab, setActiveReportTab] = useState<'financial' | 'herd' | 'breeding' | 'feed'>('financial');

  // --- Financial Analytics ---
  const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Category-wise expenses
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  // --- Herd Analytics ---
  const activePigs = pigs.filter((p) => p.status === 'Active');
  const soldPigs = pigs.filter((p) => p.status === 'Sold');
  const deadPigs = pigs.filter((p) => p.status === 'Dead');
  const totalRecorded = pigs.length;
  const mortalityRate = totalRecorded > 0 ? ((deadPigs.length / totalRecorded) * 100).toFixed(1) : '0';

  // Breeds breakdown
  const breedCounts: Record<string, number> = {};
  pigs.forEach((p) => {
    breedCounts[p.breed] = (breedCounts[p.breed] || 0) + 1;
  });

  // Categories breakdown
  const categoryCounts: Record<string, number> = {};
  pigs.forEach((p) => {
    categoryCounts[p.status] = (categoryCounts[p.status] || 0) + 1;
  });

  // --- Breeding Analytics ---
  const totalBreedings = breedingRecords.length;
  const pregnantCount = breedingRecords.filter((b) => b.status === 'Pregnant').length;
  const farrowedCount = breedingRecords.filter((b) => b.status === 'Delivered').length;
  const conceptionRate = totalBreedings > 0 ? (((pregnantCount + farrowedCount) / totalBreedings) * 100).toFixed(1) : '0';
  const totalPigletsBorn = birthRecords.reduce((sum, b) => sum + b.piglets_born, 0);
  const totalPigletsAlive = birthRecords.reduce((sum, b) => sum + b.piglets_born_alive, 0);
  const totalStillborn = birthRecords.reduce((sum, b) => sum + b.number_stillborn, 0);
  const avgLitterSize = birthRecords.length > 0 ? (totalPigletsAlive / birthRecords.length).toFixed(1) : '0';

  // --- Feed Analytics ---
  const totalFeedProcured = feedPurchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalFeedCost = feedPurchases.reduce((sum, p) => sum + p.total_amount, 0);
  const totalWeightSold = sales.reduce((sum, s) => sum + s.weight, 0);
  const estimatedFCR = totalWeightSold > 0 ? (totalFeedProcured / totalWeightSold).toFixed(2) : '3.2';

  // CSV Export Utility
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        const escaped = ('' + (val ?? '')).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Downloaded ${filename}.csv export.`);
  };

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Reports & Swine Business Analytics"
        description="Comprehensive herd metrics, reproductive farrowing indices, feed conversion ratio, and P&L financial statements"
        badge="Live Farm Data"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportToCSV(pigs, 'pig-farm-livestock')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Herd CSV
          </button>
          <button
            type="button"
            onClick={() => exportToCSV(sales, 'pig-farm-sales')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Sales CSV
          </button>
          <button
            type="button"
            onClick={() => exportToCSV(expenses, 'pig-farm-expenses')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Expenses CSV
          </button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveReportTab('financial')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeReportTab === 'financial'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <IndianRupee className="w-4 h-4" />
          Financial P&L Statement
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('herd')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeReportTab === 'herd'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Livestock & Herd Summary
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('breeding')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeReportTab === 'breeding'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Baby className="w-4 h-4" />
          Breeding & Farrowing Performance
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('feed')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeReportTab === 'feed'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Wheat className="w-4 h-4" />
          Feed & FCR Efficiency
        </button>
      </div>

      {/* Tab 1: Financial Statement */}
      {activeReportTab === 'financial' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Gross Farm Revenue"
              value={`₹${totalRevenue.toLocaleString('en-IN')}`}
              icon={TrendingUp}
              variant="emerald"
              subtitle="From livestock sales"
            />
            <StatCard
              title="Total Farm Expenses"
              value={`₹${totalExpenses.toLocaleString('en-IN')}`}
              icon={PieChart}
              variant="rose"
              subtitle="Operating costs"
            />
            <StatCard
              title="Net Farm Profit"
              value={`₹${netProfit.toLocaleString('en-IN')}`}
              icon={IndianRupee}
              variant={netProfit >= 0 ? 'emerald' : 'rose'}
              subtitle={netProfit >= 0 ? 'Net positive return' : 'Operating loss'}
            />
            <StatCard
              title="Net Profit Margin"
              value={`${profitMargin}%`}
              icon={BarChart3}
              variant={Number(profitMargin) >= 15 ? 'emerald' : 'amber'}
              subtitle="Margin on gross turnover"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense Breakdown Card */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-stone-900 mb-3">Operating Expense Distribution</h3>
              <div className="space-y-2.5">
                {Object.entries(expenseByCategory).map(([cat, amt]) => {
                  const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-stone-700">{cat}</span>
                        <span className="font-mono font-bold text-stone-900">
                          ₹{amt.toLocaleString('en-IN')} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Health Summary */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900">Unit Economics & Key Profit Drivers</h3>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">Average Revenue per Pig Sold:</span>
                  <span className="font-mono font-bold text-stone-900">
                    ₹{sales.length > 0 ? (totalRevenue / sales.length).toFixed(0) : '0'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">Average Market Rate Realized:</span>
                  <span className="font-mono font-bold text-stone-900">
                    ₹{totalWeightSold > 0 ? (totalRevenue / totalWeightSold).toFixed(1) : '0'} / kg
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-600">Estimated Feed Cost Share:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {totalExpenses > 0
                      ? (((expenseByCategory['Feed'] || 0) / totalExpenses) * 100).toFixed(1)
                      : 0}
                    % of total costs
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-stone-600">Current Cash Position Status:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded ${
                      netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {netProfit >= 0 ? 'Healthy Operating Surplus' : 'Requires Working Capital'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Herd Summary */}
      {activeReportTab === 'herd' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Active Inventory"
              value={activePigs.length}
              icon={Activity}
              variant="emerald"
              subtitle="Living herd size"
            />
            <StatCard
              title="Total Sold Animals"
              value={soldPigs.length}
              icon={TrendingUp}
              variant="blue"
              subtitle="Commercial turnover"
            />
            <StatCard
              title="Mortality Rate"
              value={`${mortalityRate}%`}
              icon={Activity}
              variant={Number(mortalityRate) < 5 ? 'emerald' : 'rose'}
              subtitle={`${deadPigs.length} swine deaths`}
            />
            <StatCard
              title="Distinct Genetic Breeds"
              value={Object.keys(breedCounts).length}
              icon={BarChart3}
              variant="purple"
              subtitle="Breed diversity"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Breeds Chart */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-stone-900 mb-3">Herd Breed Composition</h3>
              <div className="space-y-2.5">
                {Object.entries(breedCounts).map(([breed, count]) => {
                  const pct = totalRecorded > 0 ? (count / totalRecorded) * 100 : 0;
                  return (
                    <div key={breed} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-stone-700">{breed}</span>
                        <span className="font-mono font-bold text-stone-900">
                          {count} pigs ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div className="h-full rounded-full bg-stone-800" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Chart */}
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-stone-900 mb-3">Herd Category Staging</h3>
              <div className="space-y-2.5">
                {Object.entries(categoryCounts).map(([cat, count]) => {
                  const pct = totalRecorded > 0 ? (count / totalRecorded) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-stone-700">{cat}</span>
                        <span className="font-mono font-bold text-stone-900">
                          {count} pigs ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Breeding & Farrowing */}
      {activeReportTab === 'breeding' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Conception Rate"
              value={`${conceptionRate}%`}
              icon={TrendingUp}
              variant="emerald"
              subtitle="Service success rate"
            />
            <StatCard
              title="Average Live Litter"
              value={`${avgLitterSize} piglets`}
              icon={Baby}
              variant="purple"
              subtitle="Per farrowing sow"
            />
            <StatCard
              title="Total Live Piglets"
              value={totalPigletsAlive}
              icon={Baby}
              variant="blue"
              subtitle="Born alive"
            />
            <StatCard
              title="Stillborn Count"
              value={totalStillborn}
              icon={Activity}
              variant={totalStillborn > 0 ? 'rose' : 'emerald'}
              subtitle="Swine perinatal loss"
            />
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-stone-900 mb-2">Reproductive Performance Standards</h3>
            <p className="text-xs text-stone-500 mb-4">
              Standard commercial swine benchmarking: Target conception &gt; 85%, average live litter &gt; 9.5 piglets, 114 days average gestation.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-stone-500">Mating Events Recorded:</span>
                <p className="text-lg font-bold font-mono text-stone-900 mt-1">{totalBreedings}</p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-stone-500">Completed Litters (Farrowed):</span>
                <p className="text-lg font-bold font-mono text-stone-900 mt-1">{birthRecords.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-stone-500">Active Pregnancies Tracked:</span>
                <p className="text-lg font-bold font-mono text-purple-700 mt-1">{pregnantCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Feed & FCR */}
      {activeReportTab === 'feed' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Feed Procured"
              value={`${totalFeedProcured.toLocaleString('en-IN')} kg`}
              icon={Wheat}
              variant="emerald"
              subtitle="Total commercial rations"
            />
            <StatCard
              title="Total Feed Expenditure"
              value={`₹${totalFeedCost.toLocaleString('en-IN')}`}
              icon={IndianRupee}
              variant="amber"
              subtitle="Purchased feed cost"
            />
            <StatCard
              title="Avg Feed Cost / kg"
              value={`₹${totalFeedProcured > 0 ? (totalFeedCost / totalFeedProcured).toFixed(1) : '32'} / kg`}
              icon={Wheat}
              variant="blue"
              subtitle="Blended procurement price"
            />
            <StatCard
              title="Estimated FCR"
              value={`${estimatedFCR} : 1`}
              icon={BarChart3}
              variant="purple"
              subtitle="Feed Conversion Ratio"
            />
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-stone-900">Understanding FCR (Feed Conversion Ratio)</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Feed Conversion Ratio (FCR) measures kilograms of feed required to produce one kilogram of live body weight. 
              In commercial pig farming, high-efficiency herds achieve an FCR between 2.8 and 3.5. 
              Our current farm data indicates a strong feed conversion efficiency with active rationing across starter, grower, and finisher stages.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
