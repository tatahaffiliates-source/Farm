import React, { useState } from 'react';
import { FeedItem } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface FeedPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedItems: FeedItem[];
  onSuccess: () => void;
}

export const FeedPurchaseModal: React.FC<FeedPurchaseModalProps> = ({
  isOpen,
  onClose,
  feedItems,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [feedId, setFeedId] = useState(feedItems[0]?.id || '');
  const [supplier, setSupplier] = useState('Godrej Agrovet / Maharashtra Feeds');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('500');
  const [unitPrice, setUnitPrice] = useState('32');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-4)}`);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'UPI' | 'Credit'>('Bank Transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = parseFloat(unitPrice) || 0;
  const totalAmount = qtyNum * priceNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedId) {
      error('Please select feed item.');
      return;
    }
    if (qtyNum <= 0) {
      error('Quantity must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedFeed = feedItems.find((f) => f.id === feedId);

      await db.recordFeedPurchase({
        feed_id: feedId,
        feed_name: selectedFeed?.name || 'Feed',
        supplier: supplier.trim(),
        purchase_date: purchaseDate,
        quantity: qtyNum,
        unit: selectedFeed?.unit || 'kg',
        unit_price: priceNum,
        total_amount: totalAmount,
        invoice_number: invoiceNumber.trim() || undefined,
        payment_method: paymentMethod,
      });

      success(`Purchased ${qtyNum} ${selectedFeed?.unit} of ${selectedFeed?.name}. Stock updated & expense logged!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to record purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Feed Purchase"
      subtitle="Increases feed inventory stock and automatically logs a farm operating expense"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Select Feed Rations" required>
            <select
              value={feedId}
              onChange={(e) => {
                setFeedId(e.target.value);
                const match = feedItems.find((f) => f.id === e.target.value);
                if (match) setUnitPrice(String(match.cost_per_unit));
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
              required
            >
              {feedItems.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.current_stock} {f.unit} in stock)
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Feed Supplier / Feed Mill" required>
            <input
              type="text"
              required
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <FormField label="Purchase Date" required>
            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>

          <FormField label="Quantity (kg / bags)" required>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold"
            />
          </FormField>

          <FormField label="Rate per Unit ($)" required>
            <input
              type="number"
              min="0.5"
              step="0.5"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
            />
          </FormField>
        </div>

        {/* Total Cost Display Box */}
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Total Purchase Cost</span>
            <p className="text-xs text-emerald-700 mt-0.5">Will be booked directly under Farm Operating Expenses</p>
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-800">
            ${totalAmount.toLocaleString('en-US')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Invoice / Receipt Number">
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. GA-99201"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
            />
          </FormField>

          <FormField label="Payment Method" required>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Bank Transfer">Bank Transfer (NEFT / RTGS)</option>
              <option value="UPI">UPI (Google Pay / PhonePe)</option>
              <option value="Cash">Cash</option>
              <option value="Credit">Credit (Payable later)</option>
            </select>
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
            {isSubmitting ? 'Recording...' : 'Save Purchase & Update Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
};