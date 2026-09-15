import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { Sidebar, NavSection } from './components/navigation/Sidebar';
import { Topbar } from './components/navigation/Topbar';
import { MobileNav } from './components/navigation/MobileNav';
import { AuthModal } from './components/auth/AuthModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { LivestockView } from './components/livestock/LivestockView';
import { BreedingView } from './components/breeding/BreedingView';
import { HealthView } from './components/health/HealthView';
import { FeedView } from './components/feed/FeedView';
import { SalesView } from './components/sales/SalesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { CustomersView } from './components/customers/CustomersView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { TeamManagement } from './components/settings/TeamManagement';

// Modals
import { QuickActionModal } from './components/common/QuickActionModal';
import { AddEditPigModal } from './components/livestock/AddEditPigModal';
import { RecordWeightModal } from './components/livestock/RecordWeightModal';
import { FeedUsageModal } from './components/feed/FeedUsageModal';
import { RecordHealthModal } from './components/health/RecordHealthModal';
import { RecordBreedingModal } from './components/breeding/RecordBreedingModal';
import { RecordSaleModal } from './components/sales/RecordSaleModal';
import { RecordExpenseModal } from './components/expenses/RecordExpenseModal';
import { FarmAssistant } from './components/assistant/FarmAssistant';

import { db } from './services/db';
import {
  Pig,
  BreedingRecord,
  BirthRecord,
  HealthRecord,
  Medicine,
  FeedItem,
  FeedPurchase,
  GeneralInventoryItem,
  Sale,
  Expense,
  Customer,
  Pen,
  FarmSettings,
  FarmDashboardStats,
} from './types';

function MainAppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-stone-100 flex items-center justify-center text-sm text-stone-600">Loading farm access...</div>;
  }

  if (!isAuthenticated) return <AuthModal />;

  return <AuthenticatedAppContent />;
}

function AuthenticatedAppContent() {
  const { role } = useAuth();
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Quick Action & Modals State
  const [isQuickActionModalOpen, setIsQuickActionModalOpen] = useState(false);
  const [isAddPigModalOpen, setIsAddPigModalOpen] = useState(false);
  const [isRecordWeightModalOpen, setIsRecordWeightModalOpen] = useState(false);
  const [isFeedUsageModalOpen, setIsFeedUsageModalOpen] = useState(false);
  const [isRecordHealthModalOpen, setIsRecordHealthModalOpen] = useState(false);
  const [isRecordBreedingModalOpen, setIsRecordBreedingModalOpen] = useState(false);
  const [isRecordSaleModalOpen, setIsRecordSaleModalOpen] = useState(false);
  const [isRecordExpenseModalOpen, setIsRecordExpenseModalOpen] = useState(false);
  const [preselectedPigId, setPreselectedPigId] = useState<string | undefined>(undefined);

  // Database State
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([]);
  const [birthRecords, setBirthRecords] = useState<BirthRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedPurchases, setFeedPurchases] = useState<FeedPurchase[]>([]);
  const [generalInventory, setGeneralInventory] = useState<GeneralInventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pens, setPens] = useState<Pen[]>([]);
  const [settings, setSettings] = useState<FarmSettings | null>(null);
  const [stats, setStats] = useState<FarmDashboardStats | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Data reload callback
  const refreshAllData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const [farm, loadedPigs, loadedBreeding, loadedBirths, loadedHealth, loadedMedicines, loadedFeeds, loadedPurchases, loadedInventory, loadedSales, loadedExpenses, loadedCustomers, loadedPens] = await Promise.all([
        db.getSettings(), db.getPigs(), db.getBreedingRecords(), db.getBirthRecords(), db.getHealthRecords(), db.getMedicines(), db.getFeedItems(), db.getFeedPurchases(), db.getGeneralInventory(), db.getSales(), db.getExpenses(), db.getCustomers(), db.getPens(),
      ]);
      setSettings(farm); setPigs(loadedPigs); setBreedingRecords(loadedBreeding); setBirthRecords(loadedBirths); setHealthRecords(loadedHealth); setMedicines(loadedMedicines); setFeedItems(loadedFeeds); setFeedPurchases(loadedPurchases); setGeneralInventory(loadedInventory); setSales(loadedSales); setExpenses(loadedExpenses); setCustomers(loadedCustomers); setPens(loadedPens);
      setStats(db.getDashboardStats({ pigs: loadedPigs, sales: loadedSales, expenses: loadedExpenses, feeds: loadedFeeds, medicines: loadedMedicines, breeding: loadedBreeding }));
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAllData();
  }, [refreshAllData]);

  if (isDataLoading || !settings || !stats) {
    return <div className="min-h-screen bg-stone-100 flex items-center justify-center text-sm text-stone-600">Loading farm data...</div>;
  }

  // Handle Quick Action Trigger
  const handleOpenQuickAction = (actionType?: string, targetPigId?: string) => {
    if (targetPigId) setPreselectedPigId(targetPigId);

    if (!actionType) {
      setIsQuickActionModalOpen(true);
      return;
    }

    switch (actionType) {
      case 'add-pig':
        setIsAddPigModalOpen(true);
        break;
      case 'record-weight':
        setIsRecordWeightModalOpen(true);
        break;
      case 'record-feeding':
        setIsFeedUsageModalOpen(true);
        break;
      case 'record-health':
        setIsRecordHealthModalOpen(true);
        break;
      case 'record-breeding':
        setIsRecordBreedingModalOpen(true);
        break;
      case 'add-sale':
        setIsRecordSaleModalOpen(true);
        break;
      case 'add-expense':
        setIsRecordExpenseModalOpen(true);
        break;
      default:
        setIsQuickActionModalOpen(true);
        break;
    }
  };

  // Safe navigation fallback if worker attempts to navigate to restricted section
  const handleSelectSection = (section: NavSection) => {
    if (role === 'worker' && ['sales', 'expenses', 'reports', 'users'].includes(section)) {
      setCurrentSection('dashboard');
      return;
    }
    setCurrentSection(section);
  };

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden">
      {/* Desktop Sidebar Navigation */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          currentSection={currentSection}
          onSelectSection={handleSelectSection}
          farmName={settings.farm_name ?? ''}
        />
      </div>

      {/* Mobile Drawer Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        currentSection={currentSection}
        onSelectSection={handleSelectSection}
        onOpenQuickAction={() => setIsQuickActionModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          currentSection={currentSection}
          stats={stats}
          onOpenQuickAction={handleOpenQuickAction}
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {currentSection === 'dashboard' && (
              <DashboardView
                stats={stats}
                pigs={pigs}
                sales={sales}
                expenses={expenses}
                healthRecords={healthRecords}
                breedingRecords={breedingRecords}
                onNavigate={handleSelectSection}
                onOpenQuickAction={handleOpenQuickAction}
              />
            )}

            {currentSection === 'livestock' && (
              <LivestockView
                pigs={pigs}
                onRefresh={() => void refreshAllData()}
                onOpenQuickAction={handleOpenQuickAction}
              />
            )}

            {currentSection === 'breeding' && (
              <BreedingView
                breedingRecords={breedingRecords}
                birthRecords={birthRecords}
                onRefresh={() => void refreshAllData()}
              />
            )}

            {currentSection === 'health' && (
              <HealthView
                healthRecords={healthRecords}
                medicines={medicines}
                pigs={pigs}
                onRefresh={() => void refreshAllData()}
              />
            )}

            {currentSection === 'feed' && (
              <FeedView
                feedItems={feedItems}
                feedPurchases={feedPurchases}
                generalInventory={generalInventory}
                onRefresh={refreshAllData}
              />
            )}

            {currentSection === 'sales' && (
              <SalesView
                sales={sales}
                customers={customers}
                pigs={pigs}
                onRefresh={refreshAllData}
              />
            )}

            {currentSection === 'expenses' && (
              <ExpensesView expenses={expenses} onRefresh={refreshAllData} />
            )}

            {currentSection === 'customers' && (
              <CustomersView
                customers={customers}
                sales={sales}
                onRefresh={refreshAllData}
              />
            )}

            {currentSection === 'reports' && (
              <ReportsView
                pigs={pigs}
                breedingRecords={breedingRecords}
                birthRecords={birthRecords}
                feedItems={feedItems}
                feedPurchases={feedPurchases}
                sales={sales}
                expenses={expenses}
              />
            )}

            {currentSection === 'users' && <TeamManagement />}

            {currentSection === 'settings' && (
              <SettingsView
                pens={pens}
                settings={settings}
                onRefresh={refreshAllData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Quick Action Modals */}
      <QuickActionModal
        isOpen={isQuickActionModalOpen}
        onClose={() => setIsQuickActionModalOpen(false)}
        onSelectAction={handleOpenQuickAction}
      />

      <AddEditPigModal
        isOpen={isAddPigModalOpen}
        onClose={() => setIsAddPigModalOpen(false)}
        onSuccess={refreshAllData}
      />

      <RecordWeightModal
        isOpen={isRecordWeightModalOpen}
        onClose={() => {
          setIsRecordWeightModalOpen(false);
          setPreselectedPigId(undefined);
        }}
        preselectedPigId={preselectedPigId}
        onSuccess={refreshAllData}
      />

      <FeedUsageModal
        isOpen={isFeedUsageModalOpen}
        onClose={() => setIsFeedUsageModalOpen(false)}
        feedItems={feedItems}
        onSuccess={refreshAllData}
      />

      <RecordHealthModal
        isOpen={isRecordHealthModalOpen}
        onClose={() => {
          setIsRecordHealthModalOpen(false);
          setPreselectedPigId(undefined);
        }}
        preselectedPigId={preselectedPigId}
        onSuccess={refreshAllData}
      />

      <RecordBreedingModal
        isOpen={isRecordBreedingModalOpen}
        onClose={() => setIsRecordBreedingModalOpen(false)}
        onSuccess={refreshAllData}
      />

      <RecordSaleModal
        isOpen={isRecordSaleModalOpen}
        onClose={() => setIsRecordSaleModalOpen(false)}
        onSuccess={refreshAllData}
      />

      <RecordExpenseModal
        isOpen={isRecordExpenseModalOpen}
        onClose={() => setIsRecordExpenseModalOpen(false)}
        onSuccess={refreshAllData}
      />

      <FarmAssistant onRefresh={refreshAllData} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <MainAppContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
