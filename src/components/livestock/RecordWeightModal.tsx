import React, { useState, useEffect } from 'react';
import { Pig } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface RecordWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPigId?: string;
}

export const RecordWeightModal: React.FC<RecordWeightModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPigId,
}) => {
  const { success, error } = useToast();
  const [activePigs, setActivePigs] = useState<Pig[]>([]);
  const [pigId, setPigId] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('75');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    void db.getPigs().then((allPigs) => {
      if (isCancelled) return;
      const pigs = allPigs.filter((p) => p.status !== 'Sold' && p.status !== 'Dead');
      setActivePigs(pigs);

      if (preselectedPigId) {
        setPigId(preselectedPigId);
        const match = pigs.find((p) => p.id === preselectedPigId);
        if (match) setWeight(String(match.current_weight));
      } else if (pigs.length > 0) {
        setPigId(pigs[0].id);
        setWeight(String(pigs[0].current_weight));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, preselectedPigId]);

  const selectedPig = activePigs.find((p) => p.id === pigId);

  const handlePigChange = (id: string) => {
    setPigId(id);
    const match = activePigs.find((p) => p.id === id);
    if (match) setWeight(String(match.current_weight));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      error('Please enter a valid weight greater than 0.');
      return;
    }
    if (!pigId) {
      error('Please select a pig.');
      return;
    }

    setIsSubmitting(true);
    try {
      await db.addWeightRecord({
        pig_id: pigId,
        weight_date: weightDate,
        weight: weightNum,
        notes: notes.trim() || undefined,
      });

      success(`Weight record (${weightNum} kg) saved for pig ${selectedPig?.pig_id}.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to save weight record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Swine Weight"
      subtitle="Logs digital scale reading, recalculates Average Daily Gain (ADG), and checks market readiness"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Target Pig" required>
          <select
            value={pigId}
            onChange={(e) => handlePigChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            required
          >
            {activePigs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pig_id} ({p.breed}, {p.pen_location} - Current: {p.current_weight} kg)
              </option>
            ))}
          </select>
        </FormField>

        {selectedPig && (
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex justify-between text-xs">
            <span className="text-stone-500">Previous Logged Weight:</span>
            <span className="font-mono font-bold text-stone-900">{selectedPig.current_weight} kg</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Weigh-in Date" required>
            <input
              type="date"
              required
              value={weightDate}
              onChange={(e) => setWeightDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>

          <FormField label="New Weight (kg)" required>
            <input
              type="number"
              min="0.5"
              step="0.5"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold text-stone-900"
            />
          </FormField>
        </div>

        {parseFloat(weight) >= 85 && (
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800 font-medium">
            🎉 Market Weight Milestone: At ≥85 kg, this animal qualifies as ready for commercial livestock sale!
          </div>
        )}

        <FormField label="Observations / Feed Transition Notes">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Scale calibration, fasting status, appetite notes..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
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
            {isSubmitting ? 'Recording...' : 'Update Animal Weight'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
