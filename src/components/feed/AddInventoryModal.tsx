import React, { useState, useEffect } from 'react';
import { FeedItem, GeneralInventoryItem, InventoryCategory } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  feedToEdit?: FeedItem | null;
  inventoryToEdit?: GeneralInventoryItem | null;
}

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  feedToEdit,
  inventoryToEdit,
}) => {
  const { success, error } = useToast();
  const [itemType, setItemType] = useState<'feed' | 'general'>('feed');

  // Feed fields
  const [feedName, setFeedName] = useState('');
  const [feedType, setFeedType] = useState('Grower');
  const [unit, setUnit] = useState('kg');
  const [stock, setStock] = useState('500');
  const [minStock, setMinStock] = useState('200');
  const [costPerUnit, setCostPerUnit] = useState('32');

  // General inventory fields
  const [genName, setGenName] = useState('');
  const [genCategory, setGenCategory] = useState<InventoryCategory>('Sanitation');
  const [genLocation, setGenLocation] = useState('Store Room 1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!(feedToEdit || inventoryToEdit);

  // Prefill from whichever record is being edited, or reset for a new entry.
  useEffect(() => {
    if (!isOpen) return;
    if (feedToEdit) {
      setItemType('feed');
      setFeedName(feedToEdit.name || '');
      setFeedType(feedToEdit.type || feedToEdit.feed_type || 'Grower');
      setUnit(feedToEdit.unit || 'kg');
      setStock(String(feedToEdit.current_stock ?? feedToEdit.quantity ?? 0));
      setMinStock(String(feedToEdit.min_stock_level ?? feedToEdit.min_stock ?? 0));
      setCostPerUnit(String(feedToEdit.cost_per_unit ?? 0));
    } else if (inventoryToEdit) {
      setItemType('general');
      setGenName(inventoryToEdit.name || inventoryToEdit.item_name || '');
      setGenCategory((inventoryToEdit.category || 'Sanitation') as InventoryCategory);
      setUnit(inventoryToEdit.unit || 'units');
      setStock(String(inventoryToEdit.quantity ?? 0));
      setMinStock(String(inventoryToEdit.min_stock_level ?? inventoryToEdit.min_stock ?? 0));
      setGenLocation(inventoryToEdit.location || '');
    } else {
      setItemType('feed');
      setFeedName('');
      setFeedType('Grower');
      setUnit('kg');
      setStock('500');
      setMinStock('200');
      setCostPerUnit('32');
      setGenName('');
      setGenCategory('Sanitation');
      setGenLocation('Store Room 1');
    }
  }, [feedToEdit, inventoryToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (itemType === 'feed') {
        if (!feedName.trim()) throw new Error('Please enter feed ration name.');
        const feedPayload = {
          name: feedName.trim(),
          feed_type: feedType as any,
          type: feedType,
          unit,
          quantity: parseFloat(stock) || 0,
          current_stock: parseFloat(stock) || 0,
          min_stock: parseFloat(minStock) || 0,
          min_stock_level: parseFloat(minStock) || 0,
          cost_per_unit: parseFloat(costPerUnit) || 0,
        };
        if (feedToEdit) {
          await db.updateFeedItem(feedToEdit.id, feedPayload as any);
          success(`Feed item "${feedName}" updated.`);
        } else {
          await db.addFeedItem(feedPayload as any);
          success(`Feed item "${feedName}" added to inventory.`);
        }
      } else {
        if (!genName.trim()) throw new Error('Please enter inventory item name.');
        const invPayload = {
          item_name: genName.trim(),
          name: genName.trim(),
          category: genCategory as any,
          quantity: parseFloat(stock) || 0,
          unit,
          cost: 0,
          min_stock: parseFloat(minStock) || 0,
          min_stock_level: parseFloat(minStock) || 0,
          location: genLocation.trim(),
        };
        if (inventoryToEdit) {
          await db.updateInventoryItem(inventoryToEdit.id, invPayload as any);
          success(`Inventory item "${genName}" updated.`);
        } else {
          await db.addGeneralInventoryItem(invPayload as any);
          success(`Inventory item "${genName}" added to supplies.`);
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to save item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        feedToEdit
          ? `Edit Feed Ration: ${feedToEdit.name}`
          : inventoryToEdit
          ? `Edit Supply Item: ${inventoryToEdit.name || inventoryToEdit.item_name}`
          : 'Add Inventory Item or Feed Formulation'
      }
      subtitle="Register new farm rations, sanitation supplies, or farm equipment"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Inventory Classification" required>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isEditing}
              onClick={() => setItemType('feed')}
              className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                itemType === 'feed'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-stone-50 text-stone-700 border-stone-200'
              }`}
            >
              Feed Ration (Swine Diet)
            </button>
            <button
              type="button"
              disabled={isEditing}
              onClick={() => setItemType('general')}
              className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                itemType === 'general'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-stone-50 text-stone-700 border-stone-200'
              }`}
            >
              Farm Supplies / Tools
            </button>
          </div>
        </FormField>

        {itemType === 'feed' ? (
          <>
            <FormField label="Feed Name" required>
              <input
                type="text"
                required
                value={feedName}
                onChange={(e) => setFeedName(e.target.value)}
                placeholder="e.g. Grower Mash Phase-2, Creep Pellets"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Feed Stage / Type" required>
                <select
                  value={feedType}
                  onChange={(e) => setFeedType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
                >
                  <option value="Starter">Starter (Weaner)</option>
                  <option value="Grower">Grower</option>
                  <option value="Finisher">Finisher</option>
                  <option value="Lactation">Lactation (Mother Sow)</option>
                  <option value="Gestation">Gestation (Pregnant Sow)</option>
                  <option value="Boar Diet">Boar Diet</option>
                  <option value="Mineral Premix">Mineral Premix</option>
                </select>
              </FormField>

              <FormField label="Unit" required>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg, bags"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label={feedToEdit ? 'Current Stock' : 'Initial Stock'} required>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold"
                />
              </FormField>

              <FormField label="Min Safety Stock" required>
                <input
                  type="number"
                  min="0"
                  required
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
                />
              </FormField>

              <FormField label="Cost / Unit ($)">
                <input
                  type="number"
                  min="0"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
                />
              </FormField>
            </div>
          </>
        ) : (
          <>
            <FormField label="Supply / Equipment Name" required>
              <input
                type="text"
                required
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
                placeholder="e.g. Lime Powder, Infrared Heat Lamp 250W"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Supply Category" required>
                <select
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value as InventoryCategory)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
                >
                  <option value="Sanitation">Disinfectant & Sanitizer</option>
                  <option value="Feed Equipment">Feed & Water Equipment</option>
                  <option value="Tools">Veterinary & Farm Tools</option>
                  <option value="Consumable">Consumable (Syringes, Tags)</option>
                  <option value="Bedding">Bedding / Straw</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>

              <FormField label="Unit" required>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. bags, pieces, units, liters"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Quantity" required>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold"
                />
              </FormField>

              <FormField label="Min Stock Level" required>
                <input
                  type="number"
                  min="0"
                  required
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
                />
              </FormField>

              <FormField label="Storage Location">
                <input
                  type="text"
                  value={genLocation}
                  onChange={(e) => setGenLocation(e.target.value)}
                  placeholder="e.g. Feed Shed B, Store 1"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
                />
              </FormField>
            </div>
          </>
        )}

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
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add to Farm Inventory'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
