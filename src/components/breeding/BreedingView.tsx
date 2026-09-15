import React, { useState } from 'react';
import { BreedingRecord, BirthRecord } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { RecordBreedingModal } from './RecordBreedingModal';
import { RecordBirthModal } from './RecordBirthModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { HeartHandshake, Calendar, Sparkles, Plus, Baby, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface BreedingViewProps {
  breedingRecords: BreedingRecord[];
  birthRecords: BirthRecord[];
  onRefresh: () => void;
}

export const BreedingView: React.FC<BreedingViewProps> = ({
  breedingRecords,
  birthRecords,
  onRefresh,
}) => {
  const { role } = useAuth();
  const { success, error } = useToast();
  const isWorker = role === 'worker';
  const [activeSubTab, setActiveSubTab] = useState<'gestation' | 'births'>('gestation');
  const [isBreedingModalOpen, setIsBreedingModalOpen] = useState(false);
  const [isBirthModalOpen, setIsBirthModalOpen] = useState(false);
  const [selectedBreedingForBirth, setSelectedBreedingForBirth] = useState<BreedingRecord | null>(null);
  const [editingBreedingRecord, setEditingBreedingRecord] = useState<BreedingRecord | null>(null);
  const [breedingRecordToDelete, setBreedingRecordToDelete] = useState<BreedingRecord | null>(null);
  const [birthRecordToDelete, setBirthRecordToDelete] = useState<BirthRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const pregnantSows = breedingRecords.filter((b) => b.status === 'Pregnant');

  // Sows due within 14 days
  const today = new Date();
  const dueSoon = pregnantSows.filter((b) => {
    const expected = new Date(b.expected_delivery_date);
    const diffDays = Math.ceil((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  });

  // Calculate average litter size
  const totalBornAlive = birthRecords.reduce((sum, b) => sum + b.piglets_born_alive, 0);
  const avgLitterSize = birthRecords.length > 0 ? (totalBornAlive / birthRecords.length).toFixed(1) : '0';

  const handleDeleteBreedingRecord = async () => {
    if (!breedingRecordToDelete) return;
    setIsDeleting(true);
    try {
      await db.deleteBreedingRecord(breedingRecordToDelete.id);
      success(`Breeding record for ${breedingRecordToDelete.sow_tag} deleted.`);
      setBreedingRecordToDelete(null);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Could not delete breeding record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteBirthRecord = async () => {
    if (!birthRecordToDelete) return;
    setIsDeleting(true);
    try {
      await db.deleteBirthRecord(birthRecordToDelete.id);
      success(`Birth record for ${birthRecordToDelete.sow_tag} deleted.`);
      setBirthRecordToDelete(null);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Could not delete birth record.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Breeding & Reproduction Management"
        description="Monitor sow mating cycles, 114-day swine gestation schedules, and farrowing litter performance"
        badge={`${pregnantSows.length} Pregnant Sows`}
        action={{
          label: 'Record Mating / AI',
          icon: Plus,
          onClick: () => setIsBreedingModalOpen(true),
        }}
        secondaryAction={{
          label: 'Log Birth (Farrowing)',
          icon: Baby,
          onClick: () => {
            setSelectedBreedingForBirth(null);
            setIsBirthModalOpen(true);
          },
        }}
      />

      {/* Breeding KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Active Gestating Sows"
          value={pregnantSows.length}
          icon={HeartHandshake}
          variant="purple"
          subtitle="Confirmed pregnant"
        />
        <StatCard
          title="Due in 14 Days"
          value={dueSoon.length}
          icon={Calendar}
          variant={dueSoon.length > 0 ? 'amber' : 'default'}
          subtitle="Prepare farrowing pens"
        />
        <StatCard
          title="Total Litters Logged"
          value={birthRecords.length}
          icon={Baby}
          variant="emerald"
          subtitle="Recorded births"
        />
        <StatCard
          title="Avg Live Litter Size"
          value={`${avgLitterSize} piglets`}
          icon={Sparkles}
          variant="blue"
          subtitle="Live piglets per sow"
        />
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('gestation')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeSubTab === 'gestation'
              ? 'border-purple-700 text-purple-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          Gestation & Breeding Schedules ({breedingRecords.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('births')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeSubTab === 'births'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Baby className="w-4 h-4" />
          Farrowing & Litter Logs ({birthRecords.length})
        </button>
      </div>

      {/* Tab 1: Gestation Schedules */}
      {activeSubTab === 'gestation' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          {breedingRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Sow ID</th>
                    <th className="py-3 px-4">Stud Boar</th>
                    <th className="py-3 px-4">Mating Date</th>
                    <th className="py-3 px-4">Expected Delivery (114d)</th>
                    <th className="py-3 px-4">Days Left</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {breedingRecords.map((record) => {
                    const expected = new Date(record.expected_delivery_date);
                    const diffDays = Math.ceil(
                      (expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <tr key={record.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-stone-900 text-sm">
                            {record.sow_tag}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-stone-700">
                          {record.boar_tag || 'Natural Stud'}
                        </td>
                        <td className="py-3 px-4 text-stone-600">{record.mating_date}</td>
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          {record.expected_delivery_date}
                        </td>
                        <td className="py-3 px-4">
                          {record.status === 'Pregnant' ? (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                diffDays <= 7
                                  ? 'bg-rose-100 text-rose-800 animate-pulse'
                                  : diffDays <= 14
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {diffDays > 0 ? `${diffDays} days left` : 'Due / Past'}
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {record.status === 'Pregnant' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBreedingForBirth(record);
                                  setIsBirthModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs cursor-pointer"
                              >
                                Log Birth
                              </button>
                            )}
                            {!isWorker && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBreedingRecord(record);
                                  setIsBreedingModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                                title="Edit Record"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => setBreedingRecordToDelete(record)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Record"
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
              icon={HeartHandshake}
              title="No breeding records"
              description="Record your first sow mating cycle to begin 114-day farrowing tracking."
              action={{
                label: 'Record Mating',
                onClick: () => setIsBreedingModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* Tab 2: Births & Litters */}
      {activeSubTab === 'births' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          {birthRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Birth Date</th>
                    <th className="py-3 px-4">Mother Sow</th>
                    <th className="py-3 px-4">Father Boar</th>
                    <th className="py-3 px-4">Born Alive / Total</th>
                    <th className="py-3 px-4">Stillborn</th>
                    <th className="py-3 px-4">Litter Weight</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {birthRecords.map((birth) => (
                    <tr key={birth.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-stone-900">
                        {birth.birth_date}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">{birth.sow_tag}</td>
                      <td className="py-3 px-4 text-stone-600">{birth.boar_tag || 'Breeding Boar'}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-700">{birth.piglets_born_alive}</span>
                        <span className="text-stone-400"> / {birth.piglets_born} piglets</span>
                      </td>
                      <td className="py-3 px-4">
                        {birth.number_stillborn > 0 ? (
                          <span className="text-rose-600 font-semibold">{birth.number_stillborn}</span>
                        ) : (
                          <span className="text-stone-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">
                        {birth.litter_weight ? `${birth.litter_weight} kg` : '-'}
                      </td>
                      <td className="py-3 px-4 text-stone-600">{birth.pen_location}</td>
                      <td className="py-3 px-4 text-right">
                        {role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => setBirthRecordToDelete(birth)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={Baby}
              title="No litter birth records"
              description="When a sow farrows, log the birth to record litter counts and batch-create piglets."
              action={{
                label: 'Record Farrowing',
                onClick: () => setIsBirthModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {/* Record Breeding Modal */}
      <RecordBreedingModal
        isOpen={isBreedingModalOpen}
        onClose={() => {
          setIsBreedingModalOpen(false);
          setEditingBreedingRecord(null);
        }}
        onSuccess={onRefresh}
        breedingRecordToEdit={editingBreedingRecord}
      />

      {/* Record Birth Modal */}
      <RecordBirthModal
        isOpen={isBirthModalOpen}
        onClose={() => {
          setIsBirthModalOpen(false);
          setSelectedBreedingForBirth(null);
        }}
        breedingRecord={selectedBreedingForBirth}
        onSuccess={onRefresh}
      />

      {/* Confirm Deletion Dialog - Breeding Records */}
      <ConfirmDialog
        isOpen={!!breedingRecordToDelete}
        onClose={() => setBreedingRecordToDelete(null)}
        onConfirm={handleDeleteBreedingRecord}
        title={`Delete Breeding Record for ${breedingRecordToDelete?.sow_tag}?`}
        message={`Are you sure you want to permanently delete the breeding record for ${breedingRecordToDelete?.sow_tag} (mated on ${breedingRecordToDelete?.mating_date})? This action cannot be undone.`}
        confirmLabel="Delete Breeding Record"
        isLoading={isDeleting}
        isDestructive={true}
      />

      {/* Confirm Deletion Dialog - Birth Records */}
      <ConfirmDialog
        isOpen={!!birthRecordToDelete}
        onClose={() => setBirthRecordToDelete(null)}
        onConfirm={handleDeleteBirthRecord}
        title={`Delete Birth Record for ${birthRecordToDelete?.sow_tag}?`}
        message={`Are you sure you want to permanently delete the birth record for ${birthRecordToDelete?.sow_tag} (born on ${birthRecordToDelete?.birth_date})? This action cannot be undone. Note: This will not remove piglets already registered in the livestock table.`}
        confirmLabel="Delete Birth Record"
        isLoading={isDeleting}
        isDestructive={true}
      />
    </div>
  );
};
