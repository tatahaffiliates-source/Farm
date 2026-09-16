import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseToEdit?: Expense | null;
}

export const RecordExpenseModal: React.FC<RecordExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
}) => {
  const { success, error } = useToast();
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('Feed');
  const [amount, setAmount] = useState('1500');
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (expenseToEdit) {
      setExpenseDate(expenseToEdit.expense_date || expenseToEdit.date);
      setCategory(expenseToEdit.category);
      setAmount(String(expenseToEdit.amount));
      setDescription(expenseToEdit.description || '');
      setPayee(expenseToEdit.payee || expenseToEdit.supplier_payee || '');
      setPaymentMethod(expenseToEdit.payment_method as PaymentMethod);
      setReceiptNumber(expenseToEdit.receipt_number || '');
    } else {
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setCategory('Feed');
      setAmount('1500');
      setDescription('');
      setPayee('');
      setPaymentMethod('UPI');
      setReceiptNumber('');
    }
  }, [expenseToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      error('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      error('Please provide a brief description of the expense.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date: expenseDate,
        expense_date: expenseDate,
        category,
        amount: amountNum,
        description: description.trim(),
        payee: payee.trim() || undefined,
        supplier_payee: payee.trim() || undefined,
        payment_method: paymentMethod,
        receipt_number: receiptNumber.trim() || undefined,
      };

      if (expenseToEdit) {
        await db.updateExpense(expenseToEdit.id, payload as any);
        success(`Expense updated ($${amountNum.toLocaleString('en-US')}).`);
      } else {
        await db.addExpense(payload as any);
        success(`Expense of $${amountNum.toLocaleString('en-US')} logged under ${category}.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? `Edit Expense (${expenseToEdit.expense_date || expenseToEdit.date})` : 'Record Farm Operating Expense'}
      subtitle="Track outflows for feed, veterinary care, wages, utilities, equipment, and maintenance"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Date" required>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            />
          </FormField>

          <FormField label="Category" required>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Feed">Feed Rations</option>
              <option value="Medicine">Medicines & Pharmacy</option>
              <option value="Vaccination">Vaccinations</option>
              <option value="Labour">Labour & Farm Worker Wages</option>
              <option value="Electricity">Electricity / Power</option>
              <option value="Water">Water & Irrigation</option>
              <option value="Transportation">Transportation & Logistics</option>
              <option value="Equipment">Equipment & Machinery</option>
              <option value="Repairs">Repairs & Enclosure Maintenance</option>
              <option value="Bedding">Bedding & Straw</option>
              <option value="Veterinary">Veterinary Consultation Fees</option>
              <option value="Pig purchase">Breeding Stock Purchase</option>
              <option value="Maintenance">Farm Sanitation & Cleaning</option>
              <option value="Other">Other Miscellaneous</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Amount in USD ($)" required>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono font-bold text-stone-900"
            />
          </FormField>

          <FormField label="Payment Method" required>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="UPI">UPI (Google Pay / PhonePe)</option>
              <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
              <option value="Cash">Direct Cash</option>
              <option value="Cheque">Bank Cheque</option>
            </select>
          </FormField>
        </div>

        <FormField label="Expense Description" required>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Monthly labour wage for Sunil, Farm electricity bill, Disinfection lime"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Payee / Vendor / Recipient">
            <input
              type="text"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="e.g. State Electricity Board, Sunil Kumar"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300"
            />
          </FormField>

          <FormField label="Bill / Receipt / Voucher #">
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="e.g. RCP-0891"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 font-mono"
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
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : expenseToEdit ? 'Update Expense' : 'Save Farm Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
