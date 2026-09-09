import React, { useState, useEffect } from 'react';
import { Pig, BreedingStatus } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface RecordBreedingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedSowId?: string;
}

export const RecordBreedingModal: React.FC<RecordBreedingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedSowId,
}) => {
  const { success, error } = useToast();
  const [sows, setSows] = useState<Pig[]>([]);
  const [boars, setBoars] = useState<Pig[]>([]);

  const [sowId, setSowId] = useState('');
  const [boarId, setBoarId] = useState('');
  const [matingDate, setMatingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [serviceType, setServiceType] = useState<'Natural' | 'AI'>('Natural');
  const [status, setStatus] = useState<BreedingStatus>('Pregnant');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const allPigs = db.getPigs();
    const femalePigs = allPigs.filter((p) => p.sex === 'Female' && p.status !== 'Sold' && p.status !== 'Dead');
    const malePigs = allPigs.filter((p) => p.sex === 'Male' && p.status !== 'Sold' && p.status !== 'Dead');
    setSows(femalePigs);
    setBoars(malePigs);

    if (preselectedSowId) {
      setSowId(preselectedSowId);
    } else if (femalePigs.length > 0) {
      setSowId(femalePigs[0].id);
    }

    if (malePigs.length > 0) {
      setBoarId(malePigs[0].id);
    }
  }, [isOpen, preselectedSowId]);

  // Auto-calculate 114 days gestation (3 months, 3 weeks, 3 days)
  useEffect(() => {
    if (matingDate) {
      const d = new Date(matingDate);
      d.setDate(d.getDate() + 114);
      setExpectedDate(d.toISOString().split('T')[0]);
    }
  }, [matingDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sowId) {
      error('Please select a sow.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSow = sows.find((s) => s.id === sowId);
      const selectedBoar = boars.find((b) => b.id === boarId);

      db.addBreedingRecord({
        sow_id: sowId,
        sow_tag: selectedSow?.pig_id || 'Sow',
        boar_id: boarId || undefined,
        boar_tag: selectedBoar?.pig_id || 'Breeding Boar',
        mating_date: matingDate,
        expected_delivery_date: expectedDate,
        service_type: serviceType,
        status,
        notes: notes.trim() || undefined,
      });

      // Update sow's status to 'Pregnant' if status is Pregnant
      if (status === 'Pregnant') {
        db.updatePig(sowId, { status: 'Pregnant' });
      }

      success(`Breeding schedule recorded. Expected farrowing: ${expectedDate}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to record breeding cycle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Sow Mating / Insemination"
      subtitle="Logs service dates and automatically projects the standard 114-day swine gestation"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Select Sow (Female)" required>
            <select
              value={sowId}
              onChange={(e) => setSowId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
              required
            >
              {sows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.pig_id} - {s.breed} ({s.current_weight} kg) - {s.pen_location}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Service Boar (Stud)" required>
            <select
              value={boarId}
              onChange={(e) => setBoarId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              {boars.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.pig_id} - {b.breed} ({b.current_weight} kg)
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Mating Date" required>
            <input
              type="date"
              required
              value={matingDate}
              onChange={(e) => setMatingDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>

          <FormField
            label="Calculated Due Date (114d)"
            helperText="3 months, 3 weeks, 3 days"
          >
            <input
              type="date"
              readOnly
              value={expectedDate}
              className="w-full px-3 py-2 text-sm rounded-lg border border-purple-200 bg-purple-50 font-mono font-bold text-purple-900"
            />
          </FormField>

          <FormField label="Service Type" required>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Natural">Natural Mating</option>
              <option value="AI">Artificial Insemination (AI)</option>
            </select>
          </FormField>
        </div>

        <FormField label="Initial Status" required>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BreedingStatus)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
          >
            <option value="Pregnant">Confirmed Pregnant</option>
            <option value="Mated">Mated (Awaiting Confirmation)</option>
            <option value="Planned">Planned</option>
          </select>
        </FormField>

        <FormField label="Cycle Notes & Observations">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Heat cycle details, standing reflex, straw batch ID if AI..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
          />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'Recording...' : 'Save Breeding Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
