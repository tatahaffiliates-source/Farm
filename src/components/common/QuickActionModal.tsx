import React, { useState } from 'react';
import { Modal } from './Modal';
import { Layers, Scale, Utensils, Activity, HeartHandshake, TrendingUp, Receipt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionType: string) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const { role } = useAuth();
  const isWorker = role === 'worker';

  const actions = [
    {
      id: 'add-pig',
      title: 'Register Livestock',
      desc: 'Add new breeding boar, sow, gilt, or feeder pig to herd register',
      icon: Layers,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      id: 'record-weight',
      title: 'Log Swine Weight',
      desc: 'Record latest weighbridge / digital scale reading and growth ADG',
      icon: Scale,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'record-feeding',
      title: 'Log Daily Feeding',
      desc: 'Deduct starter, grower, or finisher rations by pen enclosure',
      icon: Utensils,
      color: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'record-health',
      title: 'Log Health / Vaccine',
      desc: 'Record vaccination, deworming, clinical treatment, or vet visit',
      icon: Activity,
      color: 'bg-rose-100 text-rose-800 border-rose-200',
    },
    {
      id: 'record-breeding',
      title: 'Record Sow Mating / AI',
      desc: 'Log sow breeding date and automatically schedule 114-day farrowing',
      icon: HeartHandshake,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    ...(!isWorker
      ? [
          {
            id: 'add-sale',
            title: 'Record Livestock Sale',
            desc: 'Calculate gross market live weight amount and invoice customer',
            icon: TrendingUp,
            color: 'bg-sky-100 text-sky-800 border-sky-200',
          },
          {
            id: 'add-expense',
            title: 'Record Farm Expense',
            desc: 'Log feed procurement, worker wages, electricity, or farm repairs',
            icon: Receipt,
            color: 'bg-stone-100 text-stone-800 border-stone-200',
          },
        ]
      : []),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rapid Farm Operations"
      subtitle="Select an operational workflow to log immediately"
      maxWidth="md"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => {
                onClose();
                onSelectAction(act.id);
              }}
              className="p-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-emerald-400 transition-all text-left flex items-start gap-3 cursor-pointer group shadow-2xs"
            >
              <div className={`p-2.5 rounded-lg border shrink-0 ${act.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                  {act.title}
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{act.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
