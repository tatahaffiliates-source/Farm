import React, { useState, useEffect } from 'react';
import { Pig, BreedingRecord } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface RecordBirthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  breedingRecord?: BreedingRecord | null;
}

export const RecordBirthModal: React.FC<RecordBirthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  breedingRecord,
}) => {
  const { success, error } = useToast();
  const [sows, setSows] = useState<Pig[]>([]);
  const [sowId, setSowId] = useState('');
  const [boarTag, setBoarTag] = useState('');
  const [birthDate, setBirthDate] = useState(new Date().toISOString().split('T')[0]);
  const [bornCount, setBornCount] = useState<number>(10);
  const [bornAlive, setBornAlive] = useState<number>(9);
  const [stillborn, setStillborn] = useState<number>(1);
  const [mummified, setMummified] = useState<number>(0);
  const [litterWeight, setLitterWeight] = useState<string>('12.5');
  const [penLocation, setPenLocation] = useState('Maternity Farrowing Pen B-1');
  const [autoRegister, setAutoRegister] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void db.getPigs().then((allPigs) => {
      const femalePigs = allPigs.filter((p) => p.sex === 'Female');
      setSows(femalePigs);

      if (breedingRecord) {
        setSowId(breedingRecord.sow_id);
        setBoarTag(breedingRecord.boar_tag || '');
      } else if (femalePigs.length > 0) setSowId(femalePigs[0].id);
    }).catch((err) => error(err.message));
  }, [isOpen, breedingRecord]);

  const handleBornChange = (total: number) => {
    setBornCount(total);
    // Keep alive + stillborn in sync
    const alive = Math.max(0, total - stillborn - mummified);
    setBornAlive(alive);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sowId) {
      error('Please select the mother sow.');
      return;
    }

    if (bornAlive + stillborn + mummified !== bornCount) {
      error('Sum of born alive, stillborn and mummified must equal total piglets born.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSow = sows.find((s) => s.id === sowId);
      const sowTag = selectedSow?.pig_id || 'Sow';

      await db.addBirthRecord({
        sow_id: sowId,
        sow_tag: sowTag,
        boar_tag: boarTag || undefined,
        breeding_id: breedingRecord?.id,
        breeding_record_id: breedingRecord?.id,
        birth_date: birthDate,
        number_born: bornCount,
        number_alive: bornAlive,
        number_stillborn: stillborn,
        number_currently_alive: bornAlive,
        litter_weight: parseFloat(litterWeight) || undefined,
        pen_location: penLocation.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Update breeding record status if linked
      if (breedingRecord) {
        await db.updateBreedingRecord(breedingRecord.id, {
          status: 'Delivered',
          actual_delivery_date: birthDate,
        });
      }

      // Update sow status back to active & location to maternity pen
      await db.updatePig(sowId, {
        status: 'Active',
        pen_location: penLocation,
      });

      // Optionally auto register each piglet in the Livestock table!
      if (autoRegister && bornAlive > 0) {
        const existingPigs = await db.getPigs();
        const baseNum = existingPigs.length + 101;
        const avgWeight = (parseFloat(litterWeight) || bornAlive * 1.3) / bornAlive;

        for (let i = 0; i < bornAlive; i++) {
          const pigletId = `P-0${baseNum + i}`;
          const pigletSex = i % 2 === 0 ? 'Female' : 'Male';
          await db.addPig({
            pig_id: pigletId,
            tag_number: `TAG-${baseNum + i}`,
            breed: selectedSow?.breed || 'Large White Yorkshire',
            sex: pigletSex,
            dob: birthDate,
            source: 'Born on Farm',
            current_weight: parseFloat(avgWeight.toFixed(2)),
            pen_location: penLocation,
            status: 'Active',
            mother_tag: sowTag,
            father_tag: boarTag || 'Breeding Boar',
            notes: `Litter birth on ${birthDate}. Dam: ${sowTag}.`,
          });
        }
      }

      success(`Birth record logged! ${bornAlive} healthy piglets added to herd records.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to record birth event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Farrowing (Litter Birth)"
      subtitle="Logs litter statistics and batch registers piglets with unique IDs"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Mother Sow" required>
            <select
              value={sowId}
              onChange={(e) => setSowId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
              required
            >
              {sows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.pig_id} - {s.breed} ({s.pen_location})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Father Boar Tag / ID">
            <input
              type="text"
              value={boarTag}
              onChange={(e) => setBoarTag(e.target.value)}
              placeholder="e.g. P-0101"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Date of Birth" required>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>

          <FormField label="Farrowing Pen Location" required>
            <input
              type="text"
              required
              value={penLocation}
              onChange={(e) => setPenLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>
        </div>

        {/* Piglet Counts */}
        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2.5">
            Litter Count Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FormField label="Total Born" required>
              <input
                type="number"
                min="1"
                max="30"
                value={bornCount}
                onChange={(e) => handleBornChange(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-stone-300 font-mono font-bold"
              />
            </FormField>

            <FormField label="Born Alive" required>
              <input
                type="number"
                min="0"
                max={bornCount}
                value={bornAlive}
                onChange={(e) => setBornAlive(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-mono font-bold"
              />
            </FormField>

            <FormField label="Stillborn">
              <input
                type="number"
                min="0"
                value={stillborn}
                onChange={(e) => setStillborn(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-stone-300 font-mono font-bold"
              />
            </FormField>

            <FormField label="Mummified">
              <input
                type="number"
                min="0"
                value={mummified}
                onChange={(e) => setMummified(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-stone-300 font-mono font-bold"
              />
            </FormField>
          </div>

          <div className="mt-3">
            <FormField label="Total Litter Weight (kg)" helperText="Combined weight of live piglets at birth">
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={litterWeight}
                onChange={(e) => setLitterWeight(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold"
              />
            </FormField>
          </div>
        </div>

        {/* Auto-register Piglets in Livestock Table */}
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
          <input
            type="checkbox"
            id="auto-register-chk"
            checked={autoRegister}
            onChange={(e) => setAutoRegister(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
          />
          <label htmlFor="auto-register-chk" className="text-xs text-emerald-900 leading-relaxed cursor-pointer">
            <strong>Batch-register {bornAlive} live piglets into Livestock Database</strong>
            <p className="text-[11px] text-emerald-700">
              Creates individual records with unique IDs, linked parents (sire & dam), and initial birth weight.
            </p>
          </label>
        </div>

        <FormField label="Farrowing Notes">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Complications, colostrum intake, teat distribution..."
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
            {isSubmitting ? 'Recording...' : 'Log Farrowing & Register Litters'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
