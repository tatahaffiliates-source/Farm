import React, { useState } from 'react';
import { HealthRecord, Medicine, Pig } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { SearchBar } from '../common/SearchBar';
import { EmptyState } from '../common/EmptyState';
import { RecordHealthModal } from './RecordHealthModal';
import { AddMedicineModal } from './AddMedicineModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Activity, AlertTriangle, ShieldAlert, Plus, Pill, Syringe, Edit2, Trash2 } from 'lucide-react';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';

interface HealthViewProps {
  healthRecords: HealthRecord[];
  medicines: Medicine[];
  pigs: Pig[];
  onRefresh: () => void;
}

export const HealthView: React.FC<HealthViewProps> = ({
  healthRecords,
  medicines,
  pigs,
  onRefresh,
}) => {
  const { success, error } = useToast();
  const { role } = useAuth();
  const isWorker = role === 'worker';
  const [activeTab, setActiveTab] = useState<'logs' | 'medicines'>('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isRecordHealthModalOpen, setIsRecordHealthModalOpen] = useState(false);
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<HealthRecord | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [medicineToDelete, setMedicineToDelete] = useState<Medicine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await db.deleteHealthRecord(recordToDelete.id);
      success('Health record deleted.');
      setRecordToDelete(null);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Could not delete health record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteMedicine = async () => {
    if (!medicineToDelete) return;
    setIsDeleting(true);
    try {
      await db.deleteMedicine(medicineToDelete.id);
      success(`${medicineToDelete.name} removed from pharmacy.`);
      setMedicineToDelete(null);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Could not delete medicine.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sick pigs count
  const sickPigsCount = pigs.filter((p) => p.status === 'Sick').length;
  // Low stock medicines
  const lowStockMedicines = medicines.filter(
    (m) => (m.current_stock ?? 0) <= (m.min_stock_level ?? 0)
  );
  // Vaccinations count
  const vaccinationsCount = healthRecords.filter((h) => h.type === 'Vaccination').length;

  // Filter logs
  const filteredLogs = healthRecords.filter((h) => {
    const matchesSearch =
      (h.pig_tag ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.condition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.veterinarian && h.veterinarian.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (h.medicine_name && h.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'All' || h.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Filter medicines
  const filteredMedicines = medicines.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuickRestock = async (medId: string, addQty: number) => {
    const med = medicines.find((m) => m.id === medId);
    if (!med) return;
    const newStock = (med.current_stock ?? 0) + addQty;
    try {
      await db.updateMedicine(medId, { current_stock: newStock });
      // Also record purchase expense
      const cost = addQty * (med.cost_per_unit ?? 0);
      if (cost > 0) {
        await db.addExpense({
          date: new Date().toISOString().split('T')[0],
          expense_date: new Date().toISOString().split('T')[0],
          category: 'Medicine',
          amount: cost,
          description: `Restocked ${addQty} ${med.unit} of ${med.name}`,
          payee: 'Agri-Vet Supplies',
          payment_method: 'UPI',
        });
      }
      success(`Restocked ${addQty} ${med.unit} of ${med.name}.`);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Failed to restock medicine.');
    }
  };

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Veterinary Health & Pharmacy"
        description="Comprehensive swine clinical logs, vaccinations, deworming schedules, and medical inventory"
        badge={`${healthRecords.length} records`}
        action={{
          label: 'Log Health Event',
          icon: Plus,
          onClick: () => {
            setEditingRecord(null);
            setIsRecordHealthModalOpen(true);
          },
        }}
        secondaryAction={{
          label: 'Add Medicine Stock',
          icon: Pill,
          onClick: () => {
            setEditingMedicine(null);
            setIsAddMedicineModalOpen(true);
          },
        }}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Clinical Events"
          value={healthRecords.length}
          icon={Activity}
          variant="emerald"
          subtitle="Treatments logged"
        />
        <StatCard
          title="Pigs in Treatment (Sick)"
          value={sickPigsCount}
          icon={ShieldAlert}
          variant={sickPigsCount > 0 ? 'rose' : 'default'}
          subtitle={sickPigsCount > 0 ? 'Under active monitoring' : 'Zero sick pigs'}
        />
        <StatCard
          title="Vaccinations Given"
          value={vaccinationsCount}
          icon={Syringe}
          variant="blue"
          subtitle="Herd immunity shots"
        />
        <StatCard
          title="Low Medicine Stock"
          value={lowStockMedicines.length}
          icon={AlertTriangle}
          variant={lowStockMedicines.length > 0 ? 'amber' : 'default'}
          subtitle="Items below min reserve"
        />
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'logs'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          Clinical Treatment & Vaccine Logs ({healthRecords.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('medicines')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'medicines'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Pill className="w-4 h-4" />
          Pharmacy & Medicine Inventory ({medicines.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={
            activeTab === 'logs'
              ? 'Search by Pig ID, diagnosis, veterinarian or drug...'
              : 'Search medicine name, category...'
          }
        />

        {activeTab === 'logs' && (
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-700 cursor-pointer w-full sm:w-auto"
          >
            <option value="All">All Event Types</option>
            <option value="Vaccination">Vaccination</option>
            <option value="Deworming">Deworming</option>
            <option value="Disease">Disease</option>
            <option value="Treatment">Treatment</option>
            <option value="Routine checkup">Routine Checkup</option>
            <option value="Injury">Injury</option>
            <option value="Vet visit">Vet Visit</option>
            <option value="Mortality">Mortality</option>
          </select>
        )}
      </div>

      {/* Tab 1: Clinical Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          {filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Pig ID</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Condition / Diagnosis</th>
                    <th className="py-3 px-4">Medicine & Dose</th>
                    <th className="py-3 px-4">Veterinarian</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                    <th className="py-3 px-4">Follow-up</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-600">{log.record_date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">{log.pig_tag}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            log.type === 'Vaccination'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : log.type === 'Disease'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : log.type === 'Deworming'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-900">{log.condition}</td>
                      <td className="py-3 px-4 text-stone-600">
                        {log.medicine_name ? (
                          <span>
                            {log.medicine_name}{' '}
                            {log.dosage && <span className="text-stone-400">({log.dosage})</span>}
                          </span>
                        ) : (
                          <span className="text-stone-400">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-700">{log.veterinarian || 'Farm Staff'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 text-right">
                        {log.cost > 0 ? `$${log.cost}` : '$0'}
                      </td>
                      <td className="py-3 px-4 text-stone-500">{log.follow_up_date || '-'}</td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isWorker && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecord(log);
                                setIsRecordHealthModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Edit Health Record"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => setRecordToDelete(log)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Health Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No clinical logs found"
              description="Record health observations, vaccinations, or veterinary treatments."
              action={{
                label: 'Log Health Event',
                onClick: () => {
                  setEditingRecord(null);
                  setIsRecordHealthModalOpen(true);
                },
              }}
            />
          )}
        </div>
      )}

      {/* Tab 2: Medicine Inventory */}
      {activeTab === 'medicines' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          {filteredMedicines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Available Stock</th>
                    <th className="py-3 px-4">Min Safety Level</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Unit Cost</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-right">Restock & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMedicines.map((med) => {
                    const isLow = (med.current_stock ?? 0) <= (med.min_stock_level ?? 0);
                    const isExpired = med.expiry_date && new Date(med.expiry_date) < new Date();

                    return (
                      <tr key={med.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-stone-900">{med.name}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                            {med.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          {med.current_stock} {med.unit}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-500">
                          {med.min_stock_level} {med.unit}
                        </td>
                        <td className="py-3 px-4">
                          {isExpired ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              Expired
                            </span>
                          ) : isLow ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Adequate
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-700">${med.cost_per_unit}</td>
                        <td className="py-3 px-4 text-stone-500">{med.expiry_date || 'N/A'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(med.id, 5)}
                              className="px-2 py-1 text-xs font-semibold rounded bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 cursor-pointer"
                            >
                              +5 {med.unit}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickRestock(med.id, 10)}
                              className="px-2 py-1 text-xs font-semibold rounded bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-800 cursor-pointer"
                            >
                              +10 {med.unit}
                            </button>

                            {!isWorker && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMedicine(med);
                                  setIsAddMedicineModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                                title="Edit Medicine"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => setMedicineToDelete(med)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Medicine"
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
              icon={Pill}
              title="No medicines registered"
              description="Register veterinary vaccines, antibiotics, and vitamins in your farm pharmacy."
              action={{
                label: 'Add Medicine',
                onClick: () => {
                  setEditingMedicine(null);
                  setIsAddMedicineModalOpen(true);
                },
              }}
            />
          )}
        </div>
      )}

      {/* Record / Edit Health Event Modal */}
      <RecordHealthModal
        isOpen={isRecordHealthModalOpen}
        onClose={() => {
          setIsRecordHealthModalOpen(false);
          setEditingRecord(null);
        }}
        recordToEdit={editingRecord}
        onSuccess={onRefresh}
      />

      {/* Add / Edit Medicine Modal */}
      <AddMedicineModal
        isOpen={isAddMedicineModalOpen}
        onClose={() => {
          setIsAddMedicineModalOpen(false);
          setEditingMedicine(null);
        }}
        medicineToEdit={editingMedicine}
        onSuccess={onRefresh}
      />

      {/* Confirm health record deletion */}
      <ConfirmDialog
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDeleteRecord}
        title="Delete this health record?"
        message={`This permanently deletes the ${recordToDelete?.type ?? ''} log for ${
          recordToDelete?.pig_tag ?? 'this pig'
        } dated ${recordToDelete?.record_date ?? ''}. Any medicine stock already deducted and any expense already logged for it stay as they are.`}
        confirmLabel="Delete Record"
        isLoading={isDeleting}
        isDestructive
      />

      {/* Confirm medicine deletion */}
      <ConfirmDialog
        isOpen={!!medicineToDelete}
        onClose={() => setMedicineToDelete(null)}
        onConfirm={handleDeleteMedicine}
        title={`Remove ${medicineToDelete?.name} from pharmacy?`}
        message={`This permanently deletes ${medicineToDelete?.name} and its stock levels from the pharmacy inventory.`}
        confirmLabel="Delete Medicine"
        isLoading={isDeleting}
        isDestructive
      />
    </div>
  );
};