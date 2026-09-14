import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { InviteWorkerModal } from './InviteWorkerModal';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { UserPlus, Users, Loader2 } from 'lucide-react';

export const TeamManagement: React.FC = () => {
  const { canAccess, user, role } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdminOrManager = canAccess(['admin', 'manager']);

  const loadTeam = async () => {
    if (!supabase || !user?.farm_id) {
      setIsLoadingTeam(false);
      return;
    }

    setIsLoadingTeam(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, farm_id, full_name, email, role, status, phone, created_at, updated_at')
      .eq('farm_id', user.farm_id)
      .order('created_at', { ascending: false });

    if (error) setErrorMessage(error.message);
    else setTeamMembers((data || []) as UserProfile[]);
    setIsLoadingTeam(false);
  };

  useEffect(() => {
    void loadTeam();
  }, [user?.farm_id]);

  if (!isAdminOrManager) {
    return <div className="p-6 text-sm text-stone-600">You do not have permission to view team management.</div>;
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-stone-700" />
          <div>
            <h2 className="text-lg font-bold text-stone-900">Farm Team</h2>
            <p className="text-xs text-stone-500">Manage members assigned to your farm.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Invite Worker
        </button>
      </div>

      {errorMessage && <p className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">{errorMessage}</p>}

      {isLoadingTeam ? (
        <div className="flex items-center gap-2 text-sm text-stone-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading team...</div>
      ) : teamMembers.length === 0 ? (
        <p className="p-5 rounded-xl border border-dashed border-stone-300 text-sm text-stone-500">No team members yet. Invite your first worker to get started.</p>
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-200 bg-white">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{member.full_name}</p>
                <p className="text-xs text-stone-500 truncate">{member.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 capitalize">{member.role}</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{member.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <InviteWorkerModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setShowInviteModal(false);
          void loadTeam();
        }}
      />
    </div>
  );
};
