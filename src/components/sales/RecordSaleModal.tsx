import React, { useState, useEffect } from 'react';
import { Pig, Customer, PaymentStatus, PaymentMethod } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface RecordSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPigId?: string;
}

export const RecordSaleModal: React.FC<RecordSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedPigId,
}) => {
  const { success, error } = useToast();
  const [activePigs, setActivePigs] = useState<Pig[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [pigId, setPigId] = useState('');
  const [weight, setWeight] = useState('95');
  const [pricePerKg, setPricePerKg] = useState('220');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([db.getPigs(), db.getCustomers()]).then(([allPigs, custs]) => {
    const pigs = allPigs.filter((p) => p.status === 'Active' || p.status === 'Sick');
    setActivePigs(pigs); setCustomers(custs);

    if (preselectedPigId) {
      setPigId(preselectedPigId);
      const matched = pigs.find((p) => p.id === preselectedPigId);
      if (matched) setWeight(String(matched.current_weight));
    } else if (pigs.length > 0) {
      setPigId(pigs[0].id);
      setWeight(String(pigs[0].current_weight));
    }

    if (custs.length > 0) {
      setCustomerId(custs[0].id);
    }
    }).catch((err) => error(err.message));
  }, [isOpen, preselectedPigId]);

  const handlePigChange = (id: string) => {
    setPigId(id);
    const matched = activePigs.find((p) => p.id === id);
    if (matched) {
      setWeight(String(matched.current_weight));
    }
  };

  const weightNum = parseFloat(weight) || 0;
  const rateNum = parseFloat(pricePerKg) || 0;
  const totalAmount = weightNum * rateNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pigId) {
      error('Please select an active pig to sell.');
      return;
    }
    if (!customerId) {
      error('Please select or register a buyer.');
      return;
    }
    if (weightNum <= 0 || rateNum <= 0) {
      error('Weight and price per kg must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedPig = activePigs.find((p) => p.id === pigId);
      const selectedCustomer = customers.find((c) => c.id === customerId);

      await db.recordSale({
        sale_date: saleDate,
        customer_id: customerId,
        customer_name: selectedCustomer?.name || 'Wholesale Buyer',
        pig_id: pigId,
        pig_tag: selectedPig?.pig_id || 'Pig',
        weight: weightNum,
        price_per_kg: rateNum,
        total_amount: totalAmount,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      });

      success(
        `Sale of ${selectedPig?.pig_id} recorded ($${totalAmount.toLocaleString('en-US')}). Pig status set to 'Sold'.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to record sale transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Livestock Sale"
      subtitle="Calculates gross revenue from live weight, logs buyer invoice, and auto-marks pig as 'Sold'"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Sale Date" required>
            <input
              type="date"
              required
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>

          <FormField label="Select Buyer / Customer" required>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type}, {c.phone})
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Select Animal to Sell (From Active Herd)" required>
          <select
            value={pigId}
            onChange={(e) => handlePigChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            required
          >
            {activePigs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pig_id} - {p.breed} ({p.current_weight} kg) - {p.pen_location} - {p.status}
              </option>
            ))}
          </select>
        </FormField>

        {/* Pricing Calculator */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Live Market Weight (kg)" required>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white font-mono font-bold"
              />
            </FormField>

            <FormField label="Agreed Price per kg ($)" required>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white font-mono font-bold"
              />
            </FormField>
          </div>

          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Total Transaction Value
              </span>
              <p className="text-xs text-emerald-700">
                Formula: {weightNum} kg × ${rateNum} / kg
              </p>
            </div>
            <span className="text-2xl font-bold font-mono text-emerald-800">
              ${totalAmount.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Payment Status" required>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Payment</option>
              <option value="Pending">Payment Pending</option>
            </select>
          </FormField>

          <FormField label="Payment Method" required>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
              <option value="UPI">UPI (QR Code / PhonePe)</option>
              <option value="Cash">Direct Cash</option>
              <option value="Cheque">Bank Cheque</option>
            </select>
          </FormField>
        </div>

        <FormField label="Sale Invoice Notes / Weighbridge Slip Details">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vehicle number, weighbridge tare ticket #, transport details..."
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
            {isSubmitting ? 'Recording...' : 'Confirm Sale & Mark Pig as Sold'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
