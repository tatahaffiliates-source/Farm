import React, { useState, useEffect } from 'react';
import { Pig, PigSex, PigStatus } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface AddEditPigModalProps {
  isOpen: boolean;
  onClose: () => void;
  pigToEdit?: Pig | null;
  onSuccess: () => void;
}

export const AddEditPigModal: React.FC<AddEditPigModalProps> = ({
  isOpen,
  onClose,
  pigToEdit,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [pigId, setPigId] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  const [breed, setBreed] = useState('Large White Yorkshire');
  const [sex, setSex] = useState<PigSex>('Female');
  const [dob, setDob] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState<'Born on Farm' | 'Purchased'>('Born on Farm');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('0');
  const [currentWeight, setCurrentWeight] = useState<string>('25');
  const [penLocation, setPenLocation] = useState('Grower Pen D-1');
  const [status, setStatus] = useState<PigStatus>('Active');
  const [fatherTag, setFatherTag] = useState('');
  const [motherTag, setMotherTag] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pigToEdit) {
      setPigId(pigToEdit.pig_id);
      setTagNumber(pigToEdit.tag_number || '');
      setBreed(pigToEdit.breed);
      setSex(pigToEdit.sex);
      setDob(pigToEdit.dob);
      setSource(pigToEdit.source);
      setPurchaseDate(pigToEdit.purchase_date || '');
      setPurchasePrice(pigToEdit.purchase_price ? String(pigToEdit.purchase_price) : '0');
      setCurrentWeight(String(pigToEdit.current_weight));
      setPenLocation(pigToEdit.pen_location);
      setStatus(pigToEdit.status);
      setFatherTag(pigToEdit.father_tag || '');
      setMotherTag(pigToEdit.mother_tag || '');
      setNotes(pigToEdit.notes || '');
    } else {
      // Auto suggest next Pig ID (e.g. P-0111)
      const existing = db.getPigs();
      const nextNum = existing.length + 101;
      setPigId(`P-0${nextNum}`);
      setTagNumber(`TAG-${nextNum}`);
      setBreed('Large White Yorkshire');
      setSex('Female');
      setDob(new Date().toISOString().split('T')[0]);
      setSource('Born on Farm');
      setPurchaseDate('');
      setPurchasePrice('0');
      setCurrentWeight('25');
      setPenLocation('Grower Pen D-1');
      setStatus('Active');
      setFatherTag('');
      setMotherTag('');
      setNotes('');
    }
    setFormError(null);
  }, [pigToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const weightNum = parseFloat(currentWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setFormError('Please enter a valid weight greater than 0 kg.');
      return;
    }

    const priceNum = parseFloat(purchasePrice);
    if (source === 'Purchased' && (isNaN(priceNum) || priceNum < 0)) {
      setFormError('Please enter a valid purchase price.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (pigToEdit) {
        db.updatePig(pigToEdit.id, {
          pig_id: pigId.trim(),
          tag_number: tagNumber.trim() || undefined,
          breed,
          sex,
          dob,
          source,
          purchase_date: source === 'Purchased' ? purchaseDate : undefined,
          purchase_price: source === 'Purchased' ? priceNum : 0,
          current_weight: weightNum,
          pen_location: penLocation.trim(),
          status,
          father_tag: fatherTag.trim() || undefined,
          mother_tag: motherTag.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        success(`Pig record ${pigId} updated successfully.`);
      } else {
        db.addPig({
          pig_id: pigId.trim(),
          tag_number: tagNumber.trim() || undefined,
          breed,
          sex,
          dob,
          source,
          purchase_date: source === 'Purchased' ? purchaseDate : undefined,
          purchase_price: source === 'Purchased' ? priceNum : 0,
          current_weight: weightNum,
          pen_location: penLocation.trim(),
          status,
          father_tag: fatherTag.trim() || undefined,
          mother_tag: motherTag.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        success(`New pig ${pigId} registered successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Error saving pig record.');
      error(err.message || 'Failed to save pig record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pigToEdit ? `Edit Pig: ${pigToEdit.pig_id}` : 'Register New Livestock (Pig)'}
      subtitle="Enter accurate identification, breed pedigree, location and live weight"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Unique Pig ID" required helperText="e.g. P-0111">
            <input
              type="text"
              required
              value={pigId}
              onChange={(e) => setPigId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold uppercase text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </FormField>

          <FormField label="Ear Tag Number" helperText="Physical tag">
            <input
              type="text"
              value={tagNumber}
              onChange={(e) => setTagNumber(e.target.value)}
              placeholder="TAG-111"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </FormField>

          <FormField label="Sex" required>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as PigSex)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            >
              <option value="Female">Female (Sow / Gilt)</option>
              <option value="Male">Male (Boar / Barrow)</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Breed" required>
            <select
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            >
              <option value="Large White Yorkshire">Large White Yorkshire</option>
              <option value="Landrace">Landrace</option>
              <option value="Duroc">Duroc</option>
              <option value="Hampshire">Hampshire</option>
              <option value="Large White Cross">Large White Cross</option>
              <option value="Duroc Cross">Duroc Cross</option>
              <option value="Indigenous / Desi Cross">Indigenous / Desi Cross</option>
            </select>
          </FormField>

          <FormField label="Date of Birth" required>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </FormField>

          <FormField label="Current Weight (kg)" required>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="500"
              required
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Pen / Enclosure" required>
            <input
              type="text"
              required
              value={penLocation}
              onChange={(e) => setPenLocation(e.target.value)}
              placeholder="e.g. Grower Pen D-1"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </FormField>

          <FormField label="Status" required>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PigStatus)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            >
              <option value="Active">Active</option>
              <option value="Pregnant">Pregnant</option>
              <option value="Sick">Sick (Under Treatment)</option>
              <option value="Sold">Sold</option>
              <option value="Dead">Dead</option>
              <option value="Transferred">Transferred</option>
              <option value="Removed">Removed</option>
            </select>
          </FormField>

          <FormField label="Source" required>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            >
              <option value="Born on Farm">Born on Farm</option>
              <option value="Purchased">Purchased</option>
            </select>
          </FormField>
        </div>

        {source === 'Purchased' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
            <FormField label="Purchase Date">
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white"
              />
            </FormField>

            <FormField label="Purchase Price (₹)">
              <input
                type="number"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white font-mono"
              />
            </FormField>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Father (Sire Tag / ID)">
            <input
              type="text"
              value={fatherTag}
              onChange={(e) => setFatherTag(e.target.value)}
              placeholder="e.g. P-0101"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
            />
          </FormField>

          <FormField label="Mother (Dam Tag / ID)">
            <input
              type="text"
              value={motherTag}
              onChange={(e) => setMotherTag(e.target.value)}
              placeholder="e.g. P-0102"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
            />
          </FormField>
        </div>

        <FormField label="Medical, Temperament or Breeding Notes">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special nutritional feed requirements, physical traits, etc."
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
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : pigToEdit ? 'Update Pig Record' : 'Save & Register Pig'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
