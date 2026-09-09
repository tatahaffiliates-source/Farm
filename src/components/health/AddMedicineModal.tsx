import React, { useState } from 'react';
import { MedicineCategory } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MedicineCategory>('Antibiotic');
  const [unit, setUnit] = useState('vials');
  const [currentStock, setCurrentStock] = useState('10');
  const [minStock, setMinStock] = useState('5');
  const [expiryDate, setExpiryDate] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('350');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Please enter medicine name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const stock = parseFloat(currentStock) || 0;
      const min = parseFloat(minStock) || 0;
      const cost = parseFloat(costPerUnit) || 0;

      db.addMedicine({
        name: name.trim(),
        category,
        unit: unit.trim(),
        quantity: stock,
        current_stock: stock,
        min_stock: min,
        min_stock_level: min,
        expiry_date: expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        cost,
        cost_per_unit: cost,
      });

      success(`Medicine ${name} added to pharmacy inventory.`);
      onSuccess();
      onClose();
      // Reset
      setName('');
      setCurrentStock('10');
      setMinStock('5');
    } catch (err: any) {
      error(err.message || 'Failed to add medicine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Medicine / Vaccine to Pharmacy"
      subtitle="Track veterinary inventory, expiry alerts, and minimum reorder thresholds"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Medicine / Vaccine Name" required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Enrofloxacin 10%, Ivermectin"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Category" required>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MedicineCategory)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Antibiotic">Antibiotic</option>
              <option value="Vaccine">Vaccine</option>
              <option value="Dewormer">Dewormer</option>
              <option value="Vitamin">Vitamin / Mineral</option>
              <option value="Disinfectant">Disinfectant</option>
              <option value="Antiseptic">Antiseptic</option>
              <option value="Painkiller">Anti-inflammatory / Painkiller</option>
            </select>
          </FormField>

          <FormField label="Measurement Unit" required>
            <input
              type="text"
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. vials, ml, tablets, bottles"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Initial Stock" required>
            <input
              type="number"
              min="0"
              step="0.5"
              required
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold"
            />
          </FormField>

          <FormField label="Min Safety Stock" required helperText="Triggers low alert">
            <input
              type="number"
              min="0"
              step="0.5"
              required
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
            />
          </FormField>

          <FormField label="Cost / Unit (₹)">
            <input
              type="number"
              min="0"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
            />
          </FormField>
        </div>

        <FormField label="Expiry Date">
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
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
            {isSubmitting ? 'Saving...' : 'Add Medicine to Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
