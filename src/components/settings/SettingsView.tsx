import React, { useState } from 'react';
import { Pen, FarmSettings, PenType, PenStatus, UserProfile, UserRole } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { InviteWorkerModal } from './InviteWorkerModal';
import { Settings, Home, Shield, RefreshCw, Plus, Users, Check } from 'lucide-react';

interface SettingsViewProps {
  pens: Pen[];
  settings: FarmSettings;
  section?: 'settings' | 'users';
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ pens, settings, section = 'settings', onRefresh }) => {
  const { role } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'farm' | 'pens' | 'rbac' | 'system' | 'users'>(section === 'users' ? 'users' : 'pens');
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [pendingWorkers, setPendingWorkers] = useState<UserProfile[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Farm profile form state
  const [farmName, setFarmName] = useState(settings.farm_name);
  const [ownerName, setOwnerName] = useState(settings.owner_name);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);

  // Pen management modal state
  const [isPenModalOpen, setIsPenModalOpen] = useState(false);
  const [editingPen, setEditingPen] = useState<Pen | null>(null);
  const [penName, setPenName] = useState('');
  const [penType, setPenType] = useState<PenType>('Grower');
  const [penCapacity, setPenCapacity] = useState('15');
  const [penStatus, setPenStatus] = useState<PenStatus>('Active');

  // Reset demo dialog state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  React.useEffect(() => {
    if (section === 'users') setActiveTab('users');
  }, [section]);

  React.useEffect(() => {
    if (activeTab !== 'users' || !['admin', 'manager'].includes(role) || !supabase) return;
    supabase.from('profiles').select('id, farm_id, full_name, email, role, status, phone, created_at, updated_at')
      .order('created_at', { ascending: true })
      .then(({ data, error: loadError }) => {
        if (loadError) error(loadError.message);
        else setTeam((data || []) as UserProfile[]);
      });
    if (role === 'admin') {
      supabase.functions.invoke('manage-user', { body: { action: 'list_pending' } })
        .then(({ data: pendingData, error: pendingError }) => {
          if (pendingError) error(pendingError.message);
          else setPendingWorkers((pendingData?.users || []) as UserProfile[]);
        });
    }
  }, [activeTab, role, error]);

  const handleAssignPendingWorker = async (profile: UserProfile) => {
    if (!supabase) return;
    const { data: assignment, error: assignError } = await supabase.functions.invoke('manage-user', {
      body: { action: 'assign_pending', user_id: profile.id },
    });
    if (assignError) {
      error(assignError.message);
      return;
    }
    setPendingWorkers((current) => current.filter((item) => item.id !== profile.id));
    setTeam((current) => [...current, { ...profile, farm_id: assignment?.farm_id || profile.farm_id, status: 'active' }]);
    success(`${profile.full_name} is now assigned to this farm.`);
  };

  const handleUserStatus = async (profile: UserProfile) => {
    if (!supabase) return;
    const nextStatus = profile.status === 'active' ? 'disabled' : 'active';
    const { error: statusError } = await supabase.functions.invoke('manage-user', {
      body: { user_id: profile.id, status: nextStatus },
    });
    if (statusError) { error(statusError.message); return; }
    setTeam((current) => current.map((item) => item.id === profile.id ? { ...item, status: nextStatus } : item));
    success(`Access ${nextStatus === 'active' ? 'restored' : 'disabled'} for ${profile.full_name}.`);
  };

  // Save farm profile
  const handleSaveFarmProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      db.updateSettings({
        name: farmName.trim(),
        farm_name: farmName.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        location: address.trim(),
      });
      success('Farm profile updated successfully.');
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Failed to update farm settings.');
    }
  };

  // Open add/edit pen modal
  const openPenModal = (pen?: Pen) => {
    if (pen) {
      setEditingPen(pen);
      setPenName(pen.name);
      setPenType(pen.type);
      setPenCapacity(String(pen.capacity));
      setPenStatus(pen.status);
    } else {
      setEditingPen(null);
      setPenName('');
      setPenType('Grower');
      setPenCapacity('15');
      setPenStatus('Active');
    }
    setIsPenModalOpen(true);
  };

  const handleSavePen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!penName.trim()) {
      error('Please enter pen identification name.');
      return;
    }
    try {
      const capNum = parseInt(penCapacity, 10) || 10;
      if (editingPen) {
        db.updatePen(editingPen.id, {
          name: penName.trim(),
          type: penType,
          capacity: capNum,
          status: penStatus,
        });
        success(`Pen ${penName} updated.`);
      } else {
        db.addPen({
          name: penName.trim(),
          type: penType,
          capacity: capNum,
          current_occupancy: 0,
          status: penStatus,
        });
        success(`Pen ${penName} created.`);
      }
      setIsPenModalOpen(false);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Failed to save pen.');
    }
  };

  const handleDeletePen = (penId: string, penName: string) => {
    if (window.confirm(`Are you sure you want to remove pen "${penName}"?`)) {
      db.deletePen(penId);
      success(`Pen "${penName}" deleted.`);
      onRefresh();
    }
  };

  // Handle Demo Data Reset
  const handleResetDemoData = () => {
    try {
      db.resetToInitialDemoData();
      success('Database successfully reset to initial production demo dataset.');
      setIsResetConfirmOpen(false);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Failed to reset database.');
    }
  };

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Settings & Facility Management"
        description="Configure farm identity, manage swine pens and housing capacity, control role permissions, and maintenance"
        badge="Farm Admin"
      />

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab('pens')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'pens'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Home className="w-4 h-4" />
          Swine Housing & Pen Enclosures ({pens.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('farm')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'farm'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          Farm Business Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'rbac'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Role Permissions (RBAC)
        </button>
        {['admin', 'manager'].includes(role) && (
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
              activeTab === 'users' ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Manage Users
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer ${
            activeTab === 'system'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Data & Diagnostics
        </button>
      </div>

      {/* Tab 1: Swine Housing & Pens */}
      {activeTab === 'pens' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Enclosure Facilities</h3>
              <p className="text-xs text-stone-500">
                Track real-time capacity and occupancy across maternity, nursery, grower, finisher, and quarantine pens
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPenModal()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Pen Enclosure
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pens.map((pen) => {
              const occupancyPct = pen.capacity > 0 ? (pen.current_occupancy / pen.capacity) * 100 : 0;
              const isFull = pen.current_occupancy >= pen.capacity;

              return (
                <div
                  key={pen.id}
                  className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm">{pen.name}</h4>
                        <span className="text-[11px] font-medium text-stone-500">{pen.type}</span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          pen.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : pen.status === 'Maintenance'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {pen.status}
                      </span>
                    </div>

                    <div className="my-3 space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-stone-500">Occupancy</span>
                        <span className="font-bold text-stone-900">
                          {pen.current_occupancy} / {pen.capacity} pigs ({occupancyPct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-rose-600' : occupancyPct > 80 ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 text-xs">
                    <button
                      type="button"
                      onClick={() => openPenModal(pen)}
                      className="text-stone-600 hover:text-emerald-700 font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                    <span className="text-stone-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleDeletePen(pen.id, pen.name)}
                      className="text-stone-400 hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Farm Profile */}
      {activeTab === 'farm' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs max-w-2xl">
          <h3 className="text-sm font-bold text-stone-900 mb-1">Farm Business Credentials</h3>
          <p className="text-xs text-stone-500 mb-5">
            Details appear on livestock sale invoices, weighbridge receipts, and veterinary compliance logs.
          </p>

          <form onSubmit={handleSaveFarmProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Farm Name" required>
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
                />
              </FormField>

              <FormField label="Proprietor / Managing Partner" required>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Official Contact Phone" required>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 font-mono"
                />
              </FormField>

              <FormField label="Official Email Address" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
                />
              </FormField>
            </div>

            <FormField label="Farm Postal Address / Survey Number" required>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <div>
                <span className="text-stone-500 font-medium">Standard Currency</span>
                <p className="font-bold text-stone-900 mt-0.5">INR (₹)</p>
              </div>
              <div>
                <span className="text-stone-500 font-medium">Swine Weight Metric</span>
                <p className="font-bold text-stone-900 mt-0.5">Kilograms (kg)</p>
              </div>
              <div>
                <span className="text-stone-500 font-medium">Swine Gestation Standard</span>
                <p className="font-bold text-stone-900 mt-0.5">114 Days Cycle</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer"
              >
                Save Farm Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Role-Based Access Control (RBAC) */}
      {activeTab === 'rbac' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs max-w-3xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Your Role & Access</h3>
            <p className="text-xs text-stone-500">
              Access is verified from your Supabase profile and enforced again by database policies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                r: 'admin' as const,
                title: 'Administrator',
                desc: 'Full system control, financial P&L, user administration, data export, and database resets.',
              },
              {
                r: 'manager' as const,
                title: 'Farm Manager',
                desc: 'Livestock management, sales invoicing, feed procurement, breeding logs, and medical records.',
              },
              {
                r: 'worker' as const,
                title: 'Field Worker',
                desc: 'Daily feeding logs, routine health entries, and herd status tracking. Restricted from financial analytics.',
              },
            ].map((item) => (
              <div
                key={item.r}
                className={`p-4 rounded-xl border transition-all ${
                  role === item.r
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-stone-900 text-sm">{item.title}</span>
                  {role === item.r && <Check className="w-4 h-4 text-emerald-700" />}
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                <span
                  className={`mt-3 inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    role === item.r ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {role === item.r ? 'Your active role' : 'Restricted role'}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-200 pt-4 text-xs text-stone-500">
            <p className="font-medium text-stone-700 mb-1">Backend Supabase RLS Security Policy:</p>
            <p>
              Row-Level Security (RLS) guarantees that even if UI controls are manipulated, the database layer restricts write privileges on <code>financial_transactions</code>, <code>sales</code>, and <code>system_settings</code> strictly to validated Admin & Manager roles.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'users' && ['admin', 'manager'].includes(role) && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Farm Team</h3>
            <p className="text-xs text-stone-500">Invite managers and workers. Role assignment is performed by the secure Supabase function.</p>
          </div>
          <button type="button" onClick={() => setIsInviteModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800">
            <Plus className="w-4 h-4" /> Invite farm user
          </button>
          {pendingWorkers.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-200">
                <h4 className="text-sm font-bold text-amber-950">Pending worker accounts</h4>
                <p className="text-xs text-amber-800 mt-0.5">These users registered publicly and are waiting for a farm assignment.</p>
              </div>
              {pendingWorkers.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-amber-100 last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">{member.full_name}</p>
                    <p className="text-xs text-stone-600 truncate">{member.email}</p>
                  </div>
                  <button type="button" onClick={() => handleAssignPendingWorker(member)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-700 text-white hover:bg-amber-800 shrink-0">
                    Assign to this farm
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {team.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-100 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{member.full_name}</p>
                  <p className="text-xs text-stone-500 truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold capitalize text-stone-600">{member.role}</span>
                  <span className={`text-xs font-semibold ${member.status === 'active' ? 'text-emerald-700' : 'text-rose-700'}`}>{member.status}</span>
                  {role === 'admin' && (
                    <button type="button" onClick={() => handleUserStatus(member)} className="text-xs font-semibold text-stone-600 hover:text-emerald-700">
                      {member.status === 'active' ? 'Disable' : 'Restore'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {team.length === 0 && <p className="p-5 text-sm text-stone-500">No farm users found.</p>}
          </div>
          <InviteWorkerModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onSuccess={onRefresh} />
        </div>
      )}

      {/* Tab 4: System & Reset */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs max-w-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Database Administration & Demo Data</h3>
            <p className="text-xs text-stone-500">
              Manage your local storage schema and test data state.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Reload Initial Production MVP Demo Dataset
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              If you have added test records or want to restore the complete, curated realistic swine dataset (18 active pigs, 5 pregnant sows, 6 feed rations, 8 medicines, 8 sales, and expenses), click below.
            </p>
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-700 hover:bg-amber-800 text-white shadow-2xs cursor-pointer"
            >
              Reset to Clean Demo State
            </button>
          </div>

          <ConfirmDialog
            isOpen={isResetConfirmOpen}
            onClose={() => setIsResetConfirmOpen(false)}
            onConfirm={handleResetDemoData}
            title="Confirm Database Reset"
            message="This will replace current local database records with the initial verified farm dataset. This action cannot be undone."
            confirmLabel="Reset Database"
            isDestructive
          />
        </div>
      )}

      {/* Add / Edit Pen Modal */}
      <Modal
        isOpen={isPenModalOpen}
        onClose={() => setIsPenModalOpen(false)}
        title={editingPen ? `Edit ${editingPen.name}` : 'Add Swine Housing Enclosure'}
        subtitle="Manage pen classification, max animal capacity, and current maintenance status"
        maxWidth="md"
      >
        <form onSubmit={handleSavePen} className="space-y-4">
          <FormField label="Pen Code / Identifier" required>
            <input
              type="text"
              required
              value={penName}
              onChange={(e) => setPenName(e.target.value)}
              placeholder="e.g. Maternity Pen B-3, Grower D-2"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Pen Housing Type" required>
              <select
                value={penType}
                onChange={(e) => setPenType(e.target.value as PenType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
              >
                <option value="Farrowing">Farrowing Pen (Maternity)</option>
                <option value="Nursery">Nursery Pen (Weaners)</option>
                <option value="Grower">Grower Pen</option>
                <option value="Finisher">Finisher Pen</option>
                <option value="Breeding">Boar Pen</option>
                <option value="Isolation">Quarantine / Sick Bay</option>
              </select>
            </FormField>

            <FormField label="Maximum Capacity (Pigs)" required>
              <input
                type="number"
                min="1"
                required
                value={penCapacity}
                onChange={(e) => setPenCapacity(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
              />
            </FormField>
          </div>

          <FormField label="Enclosure Status" required>
            <select
              value={penStatus}
              onChange={(e) => setPenStatus(e.target.value as PenStatus)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Active">Active & Operational</option>
              <option value="Maintenance">Maintenance / Disinfection</option>
              <option value="Cleaning">Cleaning & Lime Whitewash</option>
              <option value="Empty">Empty / Resting</option>
            </select>
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsPenModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer"
            >
              Save Enclosure
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
