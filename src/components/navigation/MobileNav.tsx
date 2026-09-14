import React from 'react';
import {
  LayoutDashboard,
  Layers,
  HeartHandshake,
  Activity,
  Wheat,
  TrendingUp,
  Receipt,
  Users,
  FileBarChart2,
  ShieldCheck,
  Settings,
  X,
  PlusCircle,
  LogOut,
} from 'lucide-react';
import { NavSection } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenQuickAction: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  currentSection,
  onSelectSection,
  onOpenQuickAction,
}) => {
  const { user, role, signOut } = useAuth();

  const allNav: { id: NavSection; label: string; icon: React.ElementType; roles?: UserRole[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'livestock', label: 'Livestock', icon: Layers },
    { id: 'breeding', label: 'Breeding', icon: HeartHandshake },
    { id: 'health', label: 'Health & Vet', icon: Activity },
    { id: 'feed', label: 'Feed & Stock', icon: Wheat },
    { id: 'sales', label: 'Sales', icon: TrendingUp, roles: ['admin', 'manager'] },
    { id: 'expenses', label: 'Expenses', icon: Receipt, roles: ['admin', 'manager'] },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileBarChart2, roles: ['admin', 'manager'] },
    { id: 'users', label: 'Team', icon: ShieldCheck, roles: ['admin', 'manager'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager'] },
  ];

  const filteredNav = allNav.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Slide-over Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-stone-900 text-stone-200 shadow-2xl transform transition-transform duration-200 ease-in-out lg:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🐖</span>
            <span className="font-bold text-white text-sm">Sunland Swine Farm</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trusted role indicator */}
        <div className="p-3 bg-stone-950/70 border-b border-stone-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold text-stone-400">Current Role</span>
            <span className="text-[10px] font-bold uppercase text-emerald-400">{role}</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                  isActive ? 'bg-emerald-700 text-white' : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-800 bg-stone-950/50">
          <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-[11px] text-stone-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 text-stone-400 hover:text-rose-400"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar for rapid one-handed access */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => onSelectSection('dashboard')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium ${
            currentSection === 'dashboard' ? 'text-emerald-700' : 'text-stone-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => onSelectSection('livestock')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium ${
            currentSection === 'livestock' ? 'text-emerald-700' : 'text-stone-500'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>Pigs</span>
        </button>

        {/* Central Prominent Quick Action Button */}
        <button
          onClick={onOpenQuickAction}
          className="flex flex-col items-center -mt-4 p-2.5 rounded-full bg-emerald-700 text-white shadow-md hover:bg-emerald-800 transition-transform active:scale-95"
          title="Quick Action"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        <button
          onClick={() => onSelectSection(role === 'worker' ? 'health' : 'sales')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium ${
            currentSection === 'sales' || currentSection === 'health'
              ? 'text-emerald-700'
              : 'text-stone-500'
          }`}
        >
          {role === 'worker' ? <Activity className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          <span>{role === 'worker' ? 'Health' : 'Sales'}</span>
        </button>

        <button
          onClick={() => onSelectSection('feed')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium ${
            currentSection === 'feed' ? 'text-emerald-700' : 'text-stone-500'
          }`}
        >
          <Wheat className="w-5 h-5" />
          <span>Feed</span>
        </button>
      </div>
    </>
  );
};
