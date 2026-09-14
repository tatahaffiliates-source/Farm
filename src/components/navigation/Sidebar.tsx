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
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export type NavSection =
  | 'dashboard'
  | 'livestock'
  | 'breeding'
  | 'health'
  | 'feed'
  | 'sales'
  | 'expenses'
  | 'customers'
  | 'reports'
  | 'users'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  farmName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentSection, onSelectSection, farmName }) => {
  const { user, role, signOut, isSupabaseActive } = useAuth();

  const navItems: { id: NavSection; label: string; icon: React.ElementType; roles?: UserRole[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'livestock', label: 'Livestock', icon: Layers },
    { id: 'breeding', label: 'Breeding & Births', icon: HeartHandshake },
    { id: 'health', label: 'Health & Meds', icon: Activity },
    { id: 'feed', label: 'Feed & Inventory', icon: Wheat },
    { id: 'sales', label: 'Sales', icon: TrendingUp, roles: ['admin', 'manager'] },
    { id: 'expenses', label: 'Expenses', icon: Receipt, roles: ['admin', 'manager'] },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileBarChart2, roles: ['admin', 'manager'] },
    { id: 'users', label: 'Team & Roles', icon: ShieldCheck, roles: ['admin', 'manager'] },
    { id: 'settings', label: 'Farm Settings', icon: Settings, roles: ['admin', 'manager'] },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col h-screen shrink-0 border-r border-stone-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-inner shadow-emerald-400/20">
            🐖
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white tracking-tight truncate">{farmName}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-[11px] font-medium text-stone-400">
                {isSupabaseActive ? 'Supabase Live DB' : 'Local Persistent DB'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Authenticated role indicator */}
      <div className="px-4 py-3 bg-stone-950/60 border-b border-stone-800/80">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Active Role</span>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              role === 'admin'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                : role === 'manager'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
            }`}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info Footer & Sign Out */}
      <div className="p-3 border-t border-stone-800 bg-stone-950/40">
        <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Rajesh Patil'}</p>
            <p className="text-[11px] text-stone-400 truncate">{user?.email || 'admin@sunlandswine.in'}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Log Out"
            className="p-1.5 rounded-md text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
