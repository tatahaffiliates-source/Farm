import {
  Farm, UserProfile, Pig, PigWeight, BreedingRecord, BirthRecord, Medicine,
  HealthRecord, FeedItem, FeedTransaction, InventoryItem, Customer, Sale,
  Expense, FarmDashboardStats, PigletBatchItem, Pen,
} from '../types';
import { supabase } from '../lib/supabase';

type TableName = 'farms' | 'profiles' | 'pigs' | 'pig_weights' | 'breeding_records' | 'birth_records' | 'medicines' | 'health_records' | 'feed_items' | 'feed_transactions' | 'inventory_items' | 'customers' | 'sales' | 'expenses' | 'pens';

const client = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

class FarmDatabase {
  private currentUser: UserProfile | null = null;

  public getCurrentUser(): UserProfile {
    if (!this.currentUser) throw new Error('No authenticated user.');
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile): void { this.currentUser = user; }
  private farmId(): string { return this.getCurrentUser().farm_id; }

  private async list<T>(table: TableName, order = 'created_at'): Promise<T[]> {
    const { data, error } = await client().from(table).select('*').order(order, { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as T[];
  }

  private async insert<T>(table: TableName, values: Record<string, unknown>): Promise<T> {
    const { data, error } = await client().from(table).insert({ ...values, farm_id: this.farmId() }).select('*').single();
    if (error) throw new Error(error.message);
    return data as T;
  }

  private async update<T>(table: TableName, id: string, values: Record<string, unknown>): Promise<T> {
    const { data, error } = await client().from(table).update({ ...values, updated_at: new Date().toISOString() }).eq('id', id).eq('farm_id', this.farmId()).select('*').single();
    if (error) throw new Error(error.message);
    return data as T;
  }

  private async remove(table: TableName, id: string): Promise<void> {
    const { error } = await client().from(table).delete().eq('id', id).eq('farm_id', this.farmId());
    if (error) throw new Error(error.message);
  }

  public async getFarm(): Promise<Farm> {
    const { data, error } = await client().from('farms').select('*').eq('id', this.farmId()).single();
    if (error) throw new Error(error.message);
    return data as Farm;
  }
  public getSettings(): Promise<Farm> { return this.getFarm(); }
  public updateFarm(updates: Partial<Farm>): Promise<Farm> { return this.update<Farm>('farms', this.farmId(), updates); }
  public updateSettings(updates: Partial<Farm>): Promise<Farm> { return this.updateFarm(updates); }

  public getPens(): Promise<Pen[]> { return this.list<Pen>('pens'); }
  public addPen(data: Omit<Pen, 'id'>): Promise<Pen> { return this.insert<Pen>('pens', data); }
  public updatePen(id: string, updates: Partial<Pen>): Promise<Pen> { return this.update<Pen>('pens', id, updates); }
  public deletePen(id: string): Promise<void> { return this.remove('pens', id); }

  public async getProfiles(): Promise<UserProfile[]> {
    const { data, error } = await client().from('profiles').select('*').eq('farm_id', this.farmId()).order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as UserProfile[];
  }

  public getPigs(): Promise<Pig[]> { return this.list<Pig>('pigs'); }
  public async getPigById(id: string): Promise<Pig | undefined> {
    const { data, error } = await client().from('pigs').select('*').eq('farm_id', this.farmId()).or(`id.eq.${id},pig_id.eq.${id}`).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Pig | undefined;
  }
  public addPig(data: Omit<Pig, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Promise<Pig> { return this.insert<Pig>('pigs', { ...data, created_by: this.getCurrentUser().id }); }
  public updatePig(id: string, updates: Partial<Pig>): Promise<Pig> { return this.update<Pig>('pigs', id, updates); }
  public async deletePig(id: string): Promise<void> {
    const { data, error } = await client().from('sales').select('id').eq('farm_id', this.farmId()).eq('pig_id', id).limit(1);
    if (error) throw new Error(error.message);
    if (data?.length) throw new Error('Cannot delete a pig with recorded sales. Mark it Sold or Removed instead.');
    return this.remove('pigs', id);
  }

  public async getWeights(pigId?: string): Promise<PigWeight[]> {
    let query = client().from('pig_weights').select('*').eq('farm_id', this.farmId()).order('record_date', { ascending: !pigId });
    if (pigId) query = query.eq('pig_id', pigId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as PigWeight[];
  }
  public async addWeight(data: { pig_id: string; record_date: string; weight: number; notes?: string }): Promise<PigWeight> {
    const previous = await this.getWeights(data.pig_id); const last = previous[previous.length - 1]; const gained = last ? Number((data.weight - last.weight).toFixed(2)) : 0;
    const result = await this.insert<PigWeight>('pig_weights', { ...data, weight_gained: gained, growth_rate: last ? Number(((gained / last.weight) * 100).toFixed(1)) : 0, recorded_by: this.getCurrentUser().id });
    await this.updatePig(data.pig_id, { current_weight: data.weight });
    return result;
  }
  public addWeightRecord(data: { pig_id: string; record_date?: string; weight_date?: string; weight: number; notes?: string }): Promise<PigWeight> { return this.addWeight({ pig_id: data.pig_id, record_date: data.record_date || data.weight_date || new Date().toISOString().slice(0, 10), weight: data.weight, notes: data.notes }); }

  public getBreedingRecords(): Promise<BreedingRecord[]> { return this.list<BreedingRecord>('breeding_records', 'mating_date'); }
  public async addBreedingRecord(data: Omit<BreedingRecord, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Promise<BreedingRecord> {
    const expected = data.expected_delivery_date || (() => { const date = new Date(data.mating_date); date.setDate(date.getDate() + 114); return date.toISOString().slice(0, 10); })();
    const result = await this.insert<BreedingRecord>('breeding_records', { ...data, expected_delivery_date: expected, recorded_by: this.getCurrentUser().id });
    if (result.status === 'Pregnant') await this.updatePig(result.sow_id, { status: 'Pregnant' });
    return result;
  }
  public async updateBreedingRecord(id: string, updates: Partial<BreedingRecord>): Promise<BreedingRecord> { const result = await this.update<BreedingRecord>('breeding_records', id, updates); if (updates.status === 'Pregnant') await this.updatePig(result.sow_id, { status: 'Pregnant' }); if (['Delivered', 'Failed', 'Cancelled'].includes(updates.status || '')) await this.updatePig(result.sow_id, { status: 'Active' }); return result; }

  public getBirthRecords(): Promise<BirthRecord[]> { return this.list<BirthRecord>('birth_records', 'birth_date'); }
  public async addBirthRecord(data: Omit<BirthRecord, 'id' | 'farm_id' | 'created_at'>, piglets?: PigletBatchItem[]): Promise<BirthRecord> {
    const result = await this.insert<BirthRecord>('birth_records', { ...data, recorded_by: this.getCurrentUser().id }); await this.updatePig(result.sow_id, { status: 'Active' }); if (result.breeding_id) await this.updateBreedingRecord(result.breeding_id, { status: 'Delivered', actual_delivery_date: result.birth_date });
    const sow = await this.getPigById(result.sow_id); for (const piglet of piglets || []) await this.addPig({ pig_id: piglet.pig_id, breed: `${sow?.breed || 'Cross'} Cross`, sex: piglet.sex, dob: result.birth_date, source: 'Born on Farm', current_weight: piglet.weight || 1.4, pen_location: piglet.pen_location, status: 'Active', mother_id: result.sow_id, mother_tag: result.sow_tag, father_id: result.boar_id, father_tag: result.boar_tag, notes: piglet.notes });
    return result;
  }

  public getMedicines(): Promise<Medicine[]> { return this.list<Medicine>('medicines'); }
  public addMedicine(data: Omit<Medicine, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Promise<Medicine> { return this.insert<Medicine>('medicines', data); }
  public updateMedicine(id: string, updates: Partial<Medicine>): Promise<Medicine> { return this.update<Medicine>('medicines', id, updates); }
  public deleteMedicine(id: string): Promise<void> { return this.remove('medicines', id); }
  public async deductMedicineStock(id: string, quantity = 1): Promise<void> { const medicine = (await this.getMedicines()).find((item) => item.id === id); if (medicine) await this.updateMedicine(id, { quantity: Math.max(0, medicine.quantity - quantity) }); }

  public async getHealthRecords(pigId?: string): Promise<HealthRecord[]> { const { data, error } = await client().from('health_records').select('*').eq('farm_id', this.farmId()).order('record_date', { ascending: false }); if (error) throw new Error(error.message); return ((data || []) as HealthRecord[]).filter((record) => !pigId || record.pig_id === pigId); }
  public async addHealthRecord(data: Omit<HealthRecord, 'id' | 'farm_id' | 'created_at'>, options?: { deductMedicineStock?: boolean; logExpense?: boolean }): Promise<HealthRecord> { const result = await this.insert<HealthRecord>('health_records', { ...data, recorded_by: this.getCurrentUser().id }); if (data.type === 'Disease' || data.type === 'Treatment') await this.updatePig(data.pig_id, { status: 'Sick' }); if (options?.deductMedicineStock && data.medicine_id) await this.deductMedicineStock(data.medicine_id); if (options?.logExpense && data.cost > 0) await this.addExpense({ date: data.record_date, category: data.type === 'Vaccination' ? 'Vaccination' : 'Veterinary', amount: data.cost, description: `${data.type} for Pig ${data.pig_id}: ${data.condition}`, supplier_payee: data.veterinarian || 'Veterinary Care', payment_method: 'Cash', notes: data.notes }); return result; }

  public getFeedItems(): Promise<FeedItem[]> { return this.list<FeedItem>('feed_items'); }
  public addFeedItem(data: Omit<FeedItem, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Promise<FeedItem> { return this.insert<FeedItem>('feed_items', data); }
  public updateFeedItem(id: string, updates: Partial<FeedItem>): Promise<FeedItem> { return this.update<FeedItem>('feed_items', id, updates); }
  public getFeedTransactions(): Promise<FeedTransaction[]> { return this.list<FeedTransaction>('feed_transactions', 'date'); }
  public async getFeedPurchases(): Promise<FeedTransaction[]> { return (await this.getFeedTransactions()).filter((item) => item.type === 'purchase'); }
  public async recordFeedPurchase(data: { feed_item_id?: string; feed_id?: string; quantity?: number; cost?: number; total_amount?: number; date?: string; purchase_date?: string; notes?: string; [key: string]: any }): Promise<FeedTransaction> { const feedId = data.feed_item_id || data.feed_id; const quantity = data.quantity || 0; if (quantity <= 0) throw new Error('Purchase quantity must be greater than zero.'); const feed = (await this.getFeedItems()).find((item) => item.id === feedId); if (!feed) throw new Error('Feed item not found'); const date = data.date || data.purchase_date || new Date().toISOString().slice(0, 10); const cost = data.cost ?? data.total_amount ?? 0; await this.updateFeedItem(feed.id, { quantity: feed.quantity + quantity }); const result = await this.insert<FeedTransaction>('feed_transactions', { ...data, feed_item_id: feed.id, type: 'purchase', quantity, cost, date, recorded_by: this.getCurrentUser().id }); if (cost > 0) await this.addExpense({ date, category: 'Feed', amount: cost, description: `Feed Purchase: ${feed.name} (${quantity} ${feed.unit})`, supplier_payee: data.supplier || feed.supplier || 'Feed Mill', payment_method: data.payment_method || 'Bank Transfer', notes: data.notes }); return result; }
  public async recordFeedUsage(data: { feed_item_id?: string; feed_id?: string; quantity?: number; quantity_used?: number; date?: string; usage_date?: string; notes?: string; [key: string]: any }): Promise<FeedTransaction> { const feedId = data.feed_item_id || data.feed_id; const quantity = data.quantity ?? data.quantity_used ?? 0; if (quantity <= 0) throw new Error('Feed usage quantity must be greater than zero.'); const feed = (await this.getFeedItems()).find((item) => item.id === feedId); if (!feed) throw new Error('Feed item not found'); if (feed.quantity < quantity) throw new Error(`Insufficient feed in stock. Available: ${feed.quantity} ${feed.unit}.`); const date = data.date || data.usage_date || new Date().toISOString().slice(0, 10); await this.updateFeedItem(feed.id, { quantity: feed.quantity - quantity }); return this.insert<FeedTransaction>('feed_transactions', { ...data, feed_item_id: feed.id, type: 'usage', quantity, cost: Number((quantity * feed.cost_per_unit).toFixed(2)), date, recorded_by: this.getCurrentUser().id }); }

  public getInventoryItems(): Promise<InventoryItem[]> { return this.list<InventoryItem>('inventory_items'); }
  public getGeneralInventory(): Promise<InventoryItem[]> { return this.getInventoryItems(); }
  public addInventoryItem(data: Omit<InventoryItem, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Promise<InventoryItem> { return this.insert<InventoryItem>('inventory_items', data); }
  public addGeneralInventoryItem(data: Omit<InventoryItem, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Promise<InventoryItem> { return this.addInventoryItem(data); }
  public updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> { return this.update<InventoryItem>('inventory_items', id, updates); }

  public getCustomers(): Promise<Customer[]> { return this.list<Customer>('customers'); }
  public addCustomer(data: Omit<Customer, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Promise<Customer> { return this.insert<Customer>('customers', data); }
  public updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> { return this.update<Customer>('customers', id, updates); }
  public getSales(): Promise<Sale[]> { return this.list<Sale>('sales', 'sale_date'); }
  public async addSale(data: any): Promise<Sale> { if (data.weight <= 0 || data.price_per_kg <= 0) throw new Error('Weight and price per kg must be greater than zero.'); const result = await this.insert<Sale>('sales', { ...data, total_amount: Number((data.weight * data.price_per_kg).toFixed(2)), recorded_by: this.getCurrentUser().id }); for (const id of [data.pig_id, ...(data.pig_ids || [])].filter(Boolean)) await this.updatePig(id, { status: 'Sold' }); return result; }
  public recordSale(data: any): Promise<Sale> { return this.addSale(data); }
  public getExpenses(): Promise<Expense[]> { return this.list<Expense>('expenses', 'date'); }
  public async addExpense(data: Omit<Expense, 'id' | 'farm_id' | 'created_at'>): Promise<Expense> { if (data.amount <= 0) throw new Error('Expense amount must be greater than zero.'); return this.insert<Expense>('expenses', { ...data, recorded_by: this.getCurrentUser().id }); }

  public getDashboardStats(data: { pigs: Pig[]; sales: Sale[]; expenses: Expense[]; feeds: FeedItem[]; medicines: Medicine[]; breeding: BreedingRecord[] }): FarmDashboardStats {
    const active = data.pigs.filter((pig) => ['Active', 'Pregnant', 'Sick'].includes(pig.status)); const females = active.filter((pig) => pig.sex === 'Female'); const breedingSows = females.filter((pig) => pig.current_weight >= 90 || pig.status === 'Pregnant'); const today = new Date().toISOString().slice(0, 10); const month = today.slice(0, 7); const total = (items: Array<{ amount?: number; total_amount?: number }>, prefix: string, dateKey: 'amount' | 'total_amount') => items.filter((item) => String((item as any)[dateKey === 'amount' ? 'date' : 'sale_date']).startsWith(prefix)).reduce((sum, item) => sum + Number(item[dateKey] || 0), 0); const in45 = new Date(); in45.setDate(in45.getDate() + 45); const in14 = new Date(); in14.setDate(in14.getDate() + 14);
    return { totalPigs: active.length, malePigs: active.filter((pig) => pig.sex === 'Male').length, femalePigs: females.length, piglets: active.filter((pig) => pig.current_weight <= 20 || new Date(pig.dob) >= new Date(Date.now() - 60 * 86400000)).length, breedingSows: breedingSows.length, pregnantSows: females.filter((pig) => pig.status === 'Pregnant').length, readyForSale: active.filter((pig) => pig.current_weight >= 85 && pig.status === 'Active' && !breedingSows.some((sow) => sow.id === pig.id)).length, todaySales: total(data.sales, today, 'total_amount'), todayExpenses: total(data.expenses, today, 'amount'), thisMonthSales: total(data.sales, month, 'total_amount'), thisMonthExpenses: total(data.expenses, month, 'amount'), netProfit: total(data.sales, month, 'total_amount') - total(data.expenses, month, 'amount'), lowFeedCount: data.feeds.filter((feed) => feed.quantity <= feed.min_stock).length, lowMedicineCount: data.medicines.filter((medicine) => medicine.quantity <= medicine.min_stock).length, expiringMedicinesCount: data.medicines.filter((medicine) => new Date(medicine.expiry_date) <= in45).length, upcomingDeliveriesCount: data.breeding.filter((record) => record.status === 'Pregnant' && new Date(record.expected_delivery_date) >= new Date() && new Date(record.expected_delivery_date) <= in14).length };
  }
}

export const db = new FarmDatabase();
