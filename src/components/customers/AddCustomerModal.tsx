import React, { useState, useEffect } from 'react';
import { Customer, CustomerType } from '../../types';
import { Modal } from '../common/Modal';
import { FormField } from '../common/FormField';
import { db } from '../../services/db';
import { useToast } from '../common/Toast';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerToEdit?: Customer | null;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customerToEdit,
}) => {
  const { success, error } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<CustomerType>('Wholesale Buyer');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load the record being edited, or reset to a blank form for a new one.
  useEffect(() => {
    if (!isOpen) return;
    if (customerToEdit) {
      setName(customerToEdit.name || '');
      setPhone(customerToEdit.phone || '');
      setType((customerToEdit.type ?? customerToEdit.customer_type ?? 'Wholesale Buyer') as CustomerType);
      setAddress(customerToEdit.address || '');
      setNotes(customerToEdit.notes || '');
    } else {
      setName('');
      setPhone('');
      setType('Wholesale Buyer');
      setAddress('');
      setNotes('');
    }
  }, [customerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Please enter customer/company name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        type,
        customer_type: type,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (customerToEdit) {
        await db.updateCustomer(customerToEdit.id, payload);
        success(`Customer "${name}" updated.`);
      } else {
        await db.addCustomer(payload as any);
        success(`Customer "${name}" registered in directory.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to save customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? `Edit Customer: ${customerToEdit.name}` : 'Add Buyer / Customer to Directory'}
      subtitle="Register wholesale meat merchants, pork butcher shops, and breeding stock buyers"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Buyer / Company Name" required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Royal Fresh Pork Traders, Suresh Kumar"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormField label="Customer Classification" required>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomerType)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
            >
              <option value="Wholesale Buyer">Wholesale Livestock Buyer</option>
              <option value="Retail Butcher">Pork Butcher / Retail Shop</option>
              <option value="Breeding Stock Buyer">Breeding Stock Buyer</option>
              <option value="Individual">Individual Consumer</option>
            </select>
          </FormField>

          <FormField label="Phone Number">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 font-mono"
            />
          </FormField>
        </div>

        <FormField label="Market / Business Address">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. APMC Livestock Market, Sector 12, Pune"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 text-stone-900"
          />
        </FormField>

        <FormField label="Payment Terms & Notes">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Regular collection vehicle, credit terms, target market weight..."
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
            {isSubmitting ? 'Saving...' : customerToEdit ? 'Update Customer' : 'Register Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
