import React, { useState } from 'react';
import { FeedItem } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface FeedUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedItems: FeedItem[];
  onSuccess: () => void;
}

export const FeedUsageModal: React.FC<FeedUsageModalProps> = ({
  isOpen,
  onClose,
  feedItems,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [feedId, setFeedId] = useState(feedItems[0]?.id || '');
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantityUsed, setQuantityUsed] = useState('25');
  const [penLocation, setPenLocation] = useState('Grower Pen D-1');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedFeed = feedItems.find((f) => f.id === feedId);
  const qtyNum = parseFloat(quantityUsed) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedId) {
      error('Please select feed ration.');
      return;
    }
    if (qtyNum <= 0) {
      error('Quantity used must be greater than 0.');
      return;
    }

    if (selectedFeed && qtyNum > (selectedFeed.current_stock ?? 0)) {
      error(
        `Insufficient inventory! Only ${selectedFeed.current_stock ?? 0} ${selectedFeed.unit} of ${selectedFeed.name} available.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await db.recordFeedUsage({
        feed_id: feedId,
        feed_name: selectedFeed?.name || 'Feed',
        usage_date: usageDate,
        quantity_used: qtyNum,
        unit: selectedFeed?.unit || 'kg',
        pen_location: penLocation.trim(),
        notes: notes.trim() || undefined,
      });

      success(`Deducted ${qtyNum} ${selectedFeed?.unit} of ${selectedFeed?.name} for ${penLocation}.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to record feeding usage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Daily Feed Rations & Usage"
      subtitle="Automatically deducts inventory and safeguards against negative stock levels"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Feed Ration" required>
          <select
            value={feedId}
            onChange={(e) => setFeedId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            required
          >
            {feedItems.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.current_stock} {f.unit} remaining)
              </option>
            ))}
          </select>
        </FormField>

        {selectedFeed && (
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
            <span className="text-stone-500">Current In-Stock:</span>
            <span className="font-mono font-bold text-stone-900">
              {selectedFeed.current_stock} {selectedFeed.unit}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Usage Date" required>
            <input
              type="date"
              required
              value={usageDate}
              onChange={(e) => setUsageDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>

          <FormField label="Quantity Used" required>
            <input
              type="number"
              min="0.5"
              step="0.5"
              required
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold"
            />
          </FormField>
        </div>

        <FormField label="Pen Enclosure / Animal Group" required>
          <input
            type="text"
            required
            value={penLocation}
            onChange={(e) => setPenLocation(e.target.value)}
            placeholder="e.g. Grower Pen D-1, Nursery Pen F-1, Maternity B-1"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
          />
        </FormField>

        <FormField label="Notes & Feeding Observations">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Appetite, feeder wastage, water mix..."
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
            {isSubmitting ? 'Recording...' : 'Deduct from Feed Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
};