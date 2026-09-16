import React, { useState } from 'react';
import { Pig, PigSex, PigStatus } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AddEditPigModal } from './AddEditPigModal';
import { PigProfileModal } from './PigProfileModal';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';
import {
  Layers,
  Plus,
  Scale,
  Eye,
  Edit2,
  Trash2,
  Activity,
  Filter,
} from 'lucide-react';

interface LivestockViewProps {
  pigs: Pig[];
  onRefresh: () => void;
  onOpenQuickAction: (actionType: string, pigId?: string) => void;
}

export const LivestockView: React.FC<LivestockViewProps> = ({
  pigs,
  onRefresh,
  onOpenQuickAction,
}) => {
  const { role } = useAuth();
  const { success, error } = useToast();
  const isWorker = role === 'worker';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedBreed, setSelectedBreed] = useState<string>('All');
  const [selectedSex, setSelectedSex] = useState<string>('All');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPig, setEditingPig] = useState<Pig | null>(null);
  const [selectedProfilePig, setSelectedProfilePig] = useState<Pig | null>(null);
  const [pigToDelete, setPigToDelete] = useState<Pig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Age calculation helper
  const calculateAge = (dobString: string) => {
    const dob = new Date(dobString);
    const now = new Date();
    const diffMs = now.getTime() - dob.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(totalDays / 30.4);
    if (months === 0) return `${totalDays}d`;
    return `${months}m`;
  };

  // Filter logic
  const filteredPigs = pigs.filter((pig) => {
    const matchesSearch =
      pig.pig_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pig.tag_number && pig.tag_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      pig.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pig.pen_location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'All'
        ? true
        : selectedStatus === 'ReadyForSale'
        ? pig.current_weight >= 85 && pig.status === 'Active'
        : pig.status === selectedStatus;

    const matchesBreed = selectedBreed === 'All' || pig.breed === selectedBreed;
    const matchesSex = selectedSex === 'All' || pig.sex === selectedSex;

    return matchesSearch && matchesStatus && matchesBreed && matchesSex;
  });

  const handleDeletePig = async () => {
    if (!pigToDelete) return;
    setIsDeleting(true);
    try {
      await db.deletePig(pigToDelete.id);
      success(`Pig ${pigToDelete.pig_id} removed from register.`);
      setPigToDelete(null);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Could not delete pig.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Distinct breeds for filter
  const distinctBreeds = Array.from(new Set(pigs.map((p) => p.breed)));

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Livestock Register"
        description="Individual swine herd registry with pedigree, weight records, pen location, and life-cycle status"
        badge={`${filteredPigs.length} animals shown`}
        action={
          !isWorker
            ? {
                label: 'Register New Pig',
                icon: Plus,
                onClick: () => {
                  setEditingPig(null);
                  setIsAddModalOpen(true);
                },
              }
            : undefined
        }
      />

      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by Pig ID, Ear Tag, Breed or Pen..."
          />

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-stone-300 bg-stone-50 text-stone-700 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pregnant">Pregnant</option>
              <option value="Sick">Sick</option>
              <option value="ReadyForSale">Ready for Sale (≥85kg)</option>
              <option value="Sold">Sold</option>
              <option value="Dead">Dead</option>
              <option value="Removed">Removed</option>
            </select>

            {/* Breed Filter */}
            <select
              value={selectedBreed}
              onChange={(e) => setSelectedBreed(e.target.value)}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-stone-300 bg-stone-50 text-stone-700 cursor-pointer"
            >
              <option value="All">All Breeds</option>
              {distinctBreeds.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Sex Filter */}
            <select
              value={selectedSex}
              onChange={(e) => setSelectedSex(e.target.value)}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-stone-300 bg-stone-50 text-stone-700 cursor-pointer"
            >
              <option value="All">Both Sexes</option>
              <option value="Female">Female (Sow/Gilt)</option>
              <option value="Male">Male (Boar)</option>
            </select>
          </div>
        </div>

        {/* Quick status pill counters */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-stone-100 text-xs">
          <span className="text-stone-400 font-semibold text-[11px] uppercase tracking-wider">Quick:</span>
          {[
            { label: 'All', val: 'All', count: pigs.length },
            {
              label: 'Active',
              val: 'Active',
              count: pigs.filter((p) => p.status === 'Active').length,
            },
            {
              label: 'Pregnant',
              val: 'Pregnant',
              count: pigs.filter((p) => p.status === 'Pregnant').length,
            },
            {
              label: 'Sick',
              val: 'Sick',
              count: pigs.filter((p) => p.status === 'Sick').length,
            },
            {
              label: 'Ready for Sale',
              val: 'ReadyForSale',
              count: pigs.filter((p) => p.current_weight >= 85 && p.status === 'Active').length,
            },
            {
              label: 'Sold',
              val: 'Sold',
              count: pigs.filter((p) => p.status === 'Sold').length,
            },
          ].map((pill) => (
            <button
              key={pill.val}
              type="button"
              onClick={() => setSelectedStatus(pill.val)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedStatus === pill.val
                  ? 'bg-emerald-700 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {pill.label} ({pill.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Livestock Table */}
      {filteredPigs.length > 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50/80 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Pig ID</th>
                  <th className="py-3.5 px-4">Tag / Breed</th>
                  <th className="py-3.5 px-4">Sex & Age</th>
                  <th className="py-3.5 px-4 text-right">Current Weight</th>
                  <th className="py-3.5 px-4">Pen Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPigs.map((pig) => (
                  <tr
                    key={pig.id}
                    className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedProfilePig(pig)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900 text-sm">
                          {pig.pig_id}
                        </span>
                        {pig.current_weight >= 85 && pig.status === 'Active' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                            Market Ready
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-medium text-stone-800">{pig.breed}</p>
                        <p className="text-[11px] text-stone-400">Tag: {pig.tag_number || 'None'}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold ${
                            pig.sex === 'Male' ? 'text-sky-700' : 'text-purple-700'
                          }`}
                        >
                          {pig.sex}
                        </span>
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-600">{calculateAge(pig.dob)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-stone-900 text-sm">
                        {pig.current_weight} kg
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-stone-700 font-medium">{pig.pen_location}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={pig.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedProfilePig(pig)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenQuickAction('record-weight', pig.id)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Record Weight"
                        >
                          <Scale className="w-4 h-4" />
                        </button>

                        {!isWorker && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPig(pig);
                              setIsAddModalOpen(true);
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
                            onClick={() => setPigToDelete(pig)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Pig"
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
        </div>
      ) : (
        <EmptyState
          icon={Layers}
          title="No livestock found"
          description={
            searchQuery || selectedStatus !== 'All'
              ? 'No animals match your search and filter criteria.'
              : 'Start by registering the first animal in your herd.'
          }
          action={
            !isWorker
              ? {
                  label: 'Register New Pig',
                  onClick: () => {
                    setEditingPig(null);
                    setIsAddModalOpen(true);
                  },
                }
              : undefined
          }
        />
      )}

      {/* Add / Edit Pig Modal */}
      <AddEditPigModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPig(null);
        }}
        pigToEdit={editingPig}
        onSuccess={onRefresh}
      />

      {/* Full Pig Profile Modal */}
      <PigProfileModal
        isOpen={!!selectedProfilePig}
        onClose={() => setSelectedProfilePig(null)}
        pig={selectedProfilePig}
        onRecordWeight={(pigId) => onOpenQuickAction('record-weight', pigId)}
        onRecordHealth={(pigId) => onOpenQuickAction('record-health', pigId)}
        onPigUpdated={onRefresh}
      />

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={!!pigToDelete}
        onClose={() => setPigToDelete(null)}
        onConfirm={handleDeletePig}
        title={`Remove ${pigToDelete?.pig_id} from Farm Records?`}
        message={`Are you sure you want to permanently delete pig ${pigToDelete?.pig_id} (${pigToDelete?.breed})? This will also remove associated weight and medical history.`}
        confirmLabel="Delete Pig Record"
        isLoading={isDeleting}
        isDestructive={true}
      />
    </div>
  );
};
