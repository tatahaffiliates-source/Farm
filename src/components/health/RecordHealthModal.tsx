import React, { useState, useEffect } from 'react';
import { Pig, Medicine, HealthRecordType } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface RecordHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPigId?: string;
}

export const RecordHealthModal: React.FC<RecordHealthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPigId,
}) => {
  const { success, error } = useToast();
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const [pigId, setPigId] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<HealthRecordType>('Vaccination');
  const [condition, setCondition] = useState('');
  const [medicineId, setMedicineId] = useState<string>('');
  const [dosage, setDosage] = useState('2 ml');
  const [route, setRoute] = useState('Intramuscular');
  const [deductStockQty, setDeductStockQty] = useState<number>(1);
  const [veterinarian, setVeterinarian] = useState('Dr. Anand Rao (B.V.Sc)');
  const [cost, setCost] = useState('0');
  const [followUpDate, setFollowUpDate] = useState('');
  const [outcome, setOutcome] = useState<'Resolved' | 'Under Treatment' | 'Chronic' | 'Died'>('Resolved');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const allPigs = db.getPigs().filter((p) => p.status !== 'Sold' && p.status !== 'Dead');
    const allMeds = db.getMedicines();
    setPigs(allPigs);
    setMedicines(allMeds);

    if (preselectedPigId) {
      setPigId(preselectedPigId);
    } else if (allPigs.length > 0) {
      setPigId(allPigs[0].id);
    }

    if (allMeds.length > 0) {
      setMedicineId(allMeds[0].id);
    }
  }, [isOpen, preselectedPigId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pigId) {
      error('Please select a pig.');
      return;
    }
    if (!condition.trim()) {
      error('Please enter the condition, vaccine name, or diagnosis.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedPig = pigs.find((p) => p.id === pigId);
      const selectedMed = medicines.find((m) => m.id === medicineId);

      const costNum = parseFloat(cost) || 0;

      db.addHealthRecord({
        pig_id: pigId,
        pig_tag: selectedPig?.pig_id || 'Pig',
        record_date: recordDate,
        type,
        condition: condition.trim(),
        medicine_name: selectedMed?.name || undefined,
        dosage: dosage.trim() || undefined,
        route_of_admin: route,
        veterinarian: veterinarian.trim() || undefined,
        cost: costNum,
        follow_up_date: followUpDate || undefined,
        treatment: `Administered ${selectedMed?.name || 'medication'} (${dosage}) via ${route}.`,
        notes: notes.trim() || undefined,
      });

      // Deduct medicine inventory if selected
      if (selectedMed && deductStockQty > 0) {
        db.deductMedicineStock(selectedMed.id, deductStockQty);
      }

      // If cost > 0, optionally record in farm expenses under 'Veterinary'
      if (costNum > 0) {
        db.addExpense({
          date: recordDate,
          expense_date: recordDate,
          category: type === 'Vaccination' ? 'Vaccination' : 'Veterinary',
          amount: costNum,
          description: `Medical care for ${selectedPig?.pig_id} (${condition})`,
          payee: veterinarian,
          payment_method: 'Cash',
        });
      }

      // Update pig status if sick or died
      if (outcome === 'Under Treatment') {
        db.updatePig(pigId, { status: 'Sick' });
      } else if (outcome === 'Died') {
        db.updatePig(pigId, { status: 'Dead' });
      } else if (selectedPig?.status === 'Sick' && outcome === 'Resolved') {
        db.updatePig(pigId, { status: 'Active' });
      }

      success(`Health log saved for ${selectedPig?.pig_id}.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to save health record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Health Treatment & Vaccination"
      subtitle="Logs veterinary events, updates livestock status, and deducts medicine inventory"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Target Pig" required>
            <select
              value={pigId}
              onChange={(e) => setPigId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
              required
            >
              {pigs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pig_id} ({p.breed}, {p.pen_location})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Event Type" required>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as HealthRecordType)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Vaccination">Vaccination</option>
              <option value="Deworming">Deworming</option>
              <option value="Disease">Disease / Illness</option>
              <option value="Treatment">Treatment</option>
              <option value="Routine checkup">Routine Checkup</option>
              <option value="Injury">Injury</option>
              <option value="Vet visit">Vet Visit</option>
              <option value="Mortality">Mortality (Death)</option>
            </select>
          </FormField>

          <FormField label="Date" required>
            <input
              type="date"
              required
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>
        </div>

        <FormField label="Condition / Vaccine / Symptoms" required>
          <input
            type="text"
            required
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="e.g. Swine Fever Vaccination, Iron Deficiency, Foot Rot"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
          />
        </FormField>

        {/* Medicine Inventory Link */}
        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Medicine Dispensation & Inventory Deduction
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Select Medicine">
              <select
                value={medicineId}
                onChange={(e) => setMedicineId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white"
              >
                <option value="">None / External</option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.current_stock} {m.unit} in stock)
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Dosage">
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 2 ml, 1 vial"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white"
              />
            </FormField>

            <FormField label="Route">
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white"
              >
                <option value="Intramuscular">Intramuscular (IM)</option>
                <option value="Subcutaneous">Subcutaneous (SC)</option>
                <option value="Oral">Oral (Water / Feed)</option>
                <option value="Topical">Topical / Spray</option>
                <option value="Intravenous">Intravenous (IV)</option>
              </select>
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Veterinarian Name">
            <input
              type="text"
              value={veterinarian}
              onChange={(e) => setVeterinarian(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
            />
          </FormField>

          <FormField label="Medical Cost ($)" helperText="Auto-logs to farm expenses">
            <input
              type="number"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
            />
          </FormField>

          <FormField label="Follow-up Date (Optional)">
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Outcome / Status" required>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Resolved">Resolved (Healthy / Back to Normal)</option>
              <option value="Under Treatment">Under Treatment (Keep Pig Status as Sick)</option>
              <option value="Chronic">Chronic Monitoring</option>
              <option value="Died">Died / Mortuary</option>
            </select>
          </FormField>

          <FormField label="Clinical Observations & Notes">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recovery progress, isolation pen used..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
            />
          </FormField>
        </div>

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
            {isSubmitting ? 'Saving...' : 'Save Health Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
