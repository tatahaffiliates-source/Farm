import {
  Farm,
  UserProfile,
  Pig,
  PigWeight,
  BreedingRecord,
  BirthRecord,
  Medicine,
  HealthRecord,
  FeedItem,
  FeedTransaction,
  InventoryItem,
  Customer,
  Sale,
  Expense,
  FarmDashboardStats,
  PigletBatchItem,
  Pen,
} from '../types';
import {
  initialFarm,
  initialProfiles,
  initialPigs,
  initialWeights,
  initialBreedingRecords,
  initialBirthRecords,
  initialMedicines,
  initialHealthRecords,
  initialFeedItems,
  initialFeedTransactions,
  initialInventoryItems,
  initialCustomers,
  initialSales,
  initialExpenses,
} from './seedData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const initialPens: Pen[] = [
  { id: 'pen-1', name: 'Gestation Barn A', type: 'Gestation', capacity: 15, current_occupancy: 4, status: 'Active', notes: 'Individual feeding stalls' },
  { id: 'pen-2', name: 'Farrowing Unit 1', type: 'Farrowing', capacity: 8, current_occupancy: 2, status: 'Active', notes: 'Heating lamps and creep area' },
  { id: 'pen-3', name: 'Nursery Pen 1', type: 'Nursery', capacity: 25, current_occupancy: 12, status: 'Active', notes: 'Weaned piglets under 25kg' },
  { id: 'pen-4', name: 'Grower Pen G1', type: 'Grower', capacity: 20, current_occupancy: 10, status: 'Active', notes: 'Ad-libitum feeder installed' },
  { id: 'pen-5', name: 'Finisher Enclosure F1', type: 'Finisher', capacity: 20, current_occupancy: 8, status: 'Active', notes: 'Heavy market weight hogs' },
  { id: 'pen-6', name: 'Breeding Boar Pen', type: 'Breeding', capacity: 4, current_occupancy: 2, status: 'Active', notes: 'Reinforced gates for mature boars' },
  { id: 'pen-7', name: 'Quarantine Bay', type: 'Quarantine', capacity: 6, current_occupancy: 1, status: 'Active', notes: 'Isolation for incoming or sick stock' },
];

const STORAGE_KEYS = {
  FARM: 'pfms_farm',
  PROFILES: 'pfms_profiles',
  PIGS: 'pfms_pigs',
  WEIGHTS: 'pfms_weights',
  BREEDING: 'pfms_breeding',
  BIRTHS: 'pfms_births',
  MEDICINES: 'pfms_medicines',
  HEALTH: 'pfms_health',
  FEED_ITEMS: 'pfms_feed_items',
  FEED_TX: 'pfms_feed_transactions',
  INVENTORY: 'pfms_inventory',
  CUSTOMERS: 'pfms_customers',
  SALES: 'pfms_sales',
  EXPENSES: 'pfms_expenses',
  CURRENT_USER: 'pfms_current_user',
  PENS: 'pfms_pens',
};

function getStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function setStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

class FarmDatabase {
  // Current user state for permission checks and audit logs
  private currentUser: UserProfile = getStorage<UserProfile>(
    STORAGE_KEYS.CURRENT_USER,
    initialProfiles[0] // Default to Admin
  );

  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile): void {
    this.currentUser = user;
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
  }

  // Farm Profile
  public getFarm(): Farm {
    return getStorage<Farm>(STORAGE_KEYS.FARM, initialFarm);
  }

  public getSettings(): Farm {
    return this.getFarm();
  }

  public updateFarm(updates: Partial<Farm>): Farm {
    const farm = this.getFarm();
    const updated = { ...farm, ...updates, updated_at: new Date().toISOString() };
    setStorage(STORAGE_KEYS.FARM, updated);
    return updated;
  }

  public updateSettings(updates: Partial<Farm>): Farm {
    return this.updateFarm(updates);
  }

  // Pens Management
  public getPens(): Pen[] {
    return getStorage<Pen[]>(STORAGE_KEYS.PENS, initialPens);
  }

  public addPen(penData: Omit<Pen, 'id'>): Pen {
    const pens = this.getPens();
    const newPen: Pen = {
      ...penData,
      id: `pen-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    pens.push(newPen);
    setStorage(STORAGE_KEYS.PENS, pens);
    return newPen;
  }

  public updatePen(id: string, updates: Partial<Pen>): Pen {
    const pens = this.getPens();
    const idx = pens.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Pen not found');
    pens[idx] = { ...pens[idx], ...updates, updated_at: new Date().toISOString() };
    setStorage(STORAGE_KEYS.PENS, pens);
    return pens[idx];
  }

  public deletePen(id: string): void {
    const pens = this.getPens().filter((p) => p.id !== id);
    setStorage(STORAGE_KEYS.PENS, pens);
  }

  // Users & Profiles
  public getProfiles(): UserProfile[] {
    return getStorage<UserProfile[]>(STORAGE_KEYS.PROFILES, initialProfiles);
  }

  public addProfile(profile: Omit<UserProfile, 'id' | 'created_at'>): UserProfile {
    const profiles = this.getProfiles();
    const newProfile: UserProfile = {
      ...profile,
      id: `user-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    profiles.push(newProfile);
    setStorage(STORAGE_KEYS.PROFILES, profiles);
    return newProfile;
  }

  public updateProfileRole(id: string, role: UserProfile['role'], status: UserProfile['status']): UserProfile {
    const profiles = this.getProfiles();
    const index = profiles.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('User not found');
    profiles[index] = { ...profiles[index], role, status };
    setStorage(STORAGE_KEYS.PROFILES, profiles);
    if (this.currentUser.id === id) {
      this.setCurrentUser(profiles[index]);
    }
    return profiles[index];
  }

  // Livestock (Pigs)
  public getPigs(): Pig[] {
    return getStorage<Pig[]>(STORAGE_KEYS.PIGS, initialPigs);
  }

  public getPigById(id: string): Pig | undefined {
    return this.getPigs().find((p) => p.id === id || p.pig_id === id);
  }

  public addPig(pigData: Omit<Pig, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Pig {
    const pigs = this.getPigs();
    const existing = pigs.find((p) => p.pig_id.toLowerCase() === pigData.pig_id.trim().toLowerCase());
    if (existing) {
      throw new Error(`Pig ID "${pigData.pig_id}" already exists. Please assign a unique identification code.`);
    }

    const farm = this.getFarm();
    const now = new Date().toISOString();
    const newPig: Pig = {
      ...pigData,
      id: `pig-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      farm_id: farm.id,
      created_by: this.currentUser.full_name,
      created_at: now,
      updated_at: now,
    };

    pigs.unshift(newPig);
    setStorage(STORAGE_KEYS.PIGS, pigs);

    // Record initial weight entry
    if (newPig.current_weight > 0) {
      this.addWeight({
        pig_id: newPig.id,
        record_date: newPig.purchase_date || newPig.dob || now.split('T')[0],
        weight: newPig.current_weight,
        notes: 'Initial registration weight',
      });
    }

    return newPig;
  }

  public updatePig(id: string, updates: Partial<Pig>): Pig {
    const pigs = this.getPigs();
    const index = pigs.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Pig record not found');

    // Check duplicate ID if ID changed
    if (updates.pig_id && updates.pig_id !== pigs[index].pig_id) {
      const duplicate = pigs.find(
        (p) => p.id !== id && p.pig_id.toLowerCase() === updates.pig_id!.trim().toLowerCase()
      );
      if (duplicate) throw new Error(`Pig ID "${updates.pig_id}" is already used by another animal.`);
    }

    const updated = {
      ...pigs[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    pigs[index] = updated;
    setStorage(STORAGE_KEYS.PIGS, pigs);
    return updated;
  }

  public deletePig(id: string): void {
    const pigs = this.getPigs();
    const target = pigs.find((p) => p.id === id);
    if (!target) throw new Error('Pig record not found');

    // Check historical dependencies
    const sales = this.getSales();
    const hasSales = sales.some((s) => s.pig_id === id);
    if (hasSales) {
      throw new Error(
        'Cannot permanently delete this pig because it has recorded sales transactions. You can mark its status as "Sold" or "Removed" instead to preserve accounting history.'
      );
    }

    const filtered = pigs.filter((p) => p.id !== id);
    setStorage(STORAGE_KEYS.PIGS, filtered);
  }

  // Weight Tracking
  public getWeights(pigId?: string): PigWeight[] {
    const weights = getStorage<PigWeight[]>(STORAGE_KEYS.WEIGHTS, initialWeights);
    if (pigId) {
      return weights
        .filter((w) => w.pig_id === pigId)
        .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
    }
    return weights.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  }

  public addWeight(data: { pig_id: string; record_date: string; weight: number; notes?: string }): PigWeight {
    const weights = this.getWeights();
    const farm = this.getFarm();
    const pig = this.getPigById(data.pig_id);
    if (!pig) throw new Error('Pig record not found');

    // Find previous weight for calculations
    const pigWeights = weights
      .filter((w) => w.pig_id === data.pig_id)
      .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());

    let weightGained = 0;
    let growthRate = 0;

    if (pigWeights.length > 0) {
      const lastWeight = pigWeights[pigWeights.length - 1];
      weightGained = Number((data.weight - lastWeight.weight).toFixed(2));
      growthRate = Number(((weightGained / lastWeight.weight) * 100).toFixed(1));
    }

    const newWeight: PigWeight = {
      id: `wt-${Date.now()}`,
      farm_id: farm.id,
      pig_id: data.pig_id,
      record_date: data.record_date,
      weight: data.weight,
      weight_gained: weightGained,
      growth_rate: growthRate,
      notes: data.notes,
      recorded_by: this.currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    weights.push(newWeight);
    setStorage(STORAGE_KEYS.WEIGHTS, weights);

    // Update the pig's current weight
    this.updatePig(pig.id, { current_weight: data.weight });

    return newWeight;
  }

  public addWeightRecord(data: { pig_id: string; record_date?: string; weight_date?: string; weight: number; notes?: string }): PigWeight {
    return this.addWeight({
      pig_id: data.pig_id,
      record_date: data.record_date || data.weight_date || new Date().toISOString().split('T')[0],
      weight: data.weight,
      notes: data.notes,
    });
  }

  // Breeding Management
  public getBreedingRecords(): BreedingRecord[] {
    return getStorage<BreedingRecord[]>(STORAGE_KEYS.BREEDING, initialBreedingRecords).sort(
      (a, b) => new Date(b.mating_date).getTime() - new Date(a.mating_date).getTime()
    );
  }

  public addBreedingRecord(
    data: Omit<BreedingRecord, 'id' | 'farm_id' | 'created_at' | 'updated_at'>
  ): BreedingRecord {
    const records = this.getBreedingRecords();
    const farm = this.getFarm();
    const sow = this.getPigById(data.sow_id);
    if (!sow) throw new Error('Selected sow not found');
    if (sow.sex !== 'Female') throw new Error('Selected breeding sow must be female.');

    // Auto calculate expected delivery date if missing (Gestation in swine is 114 days: 3 months, 3 weeks, 3 days)
    let expectedDelivery = data.expected_delivery_date;
    if (!expectedDelivery && data.mating_date) {
      const mating = new Date(data.mating_date);
      mating.setDate(mating.getDate() + 114);
      expectedDelivery = mating.toISOString().split('T')[0];
    }

    const newRecord: BreedingRecord = {
      ...data,
      expected_delivery_date: expectedDelivery,
      id: `br-${Date.now()}`,
      farm_id: farm.id,
      recorded_by: this.currentUser.full_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    records.unshift(newRecord);
    setStorage(STORAGE_KEYS.BREEDING, records);

    // If marked pregnant, update sow status
    if (newRecord.status === 'Pregnant') {
      this.updatePig(sow.id, { status: 'Pregnant' });
    }

    return newRecord;
  }

  public updateBreedingRecord(id: string, updates: Partial<BreedingRecord>): BreedingRecord {
    const records = this.getBreedingRecords();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Breeding record not found');

    const updated = {
      ...records[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    records[index] = updated;
    setStorage(STORAGE_KEYS.BREEDING, records);

    // Update sow status accordingly
    if (updates.status === 'Pregnant') {
      this.updatePig(updated.sow_id, { status: 'Pregnant' });
    } else if (updates.status === 'Delivered' || updates.status === 'Failed' || updates.status === 'Cancelled') {
      this.updatePig(updated.sow_id, { status: 'Active' });
    }

    return updated;
  }

  // Birth & Piglet Registration
  public getBirthRecords(): BirthRecord[] {
    return getStorage<BirthRecord[]>(STORAGE_KEYS.BIRTHS, initialBirthRecords).sort(
      (a, b) => new Date(b.birth_date).getTime() - new Date(a.birth_date).getTime()
    );
  }

  public addBirthRecord(
    birthData: Omit<BirthRecord, 'id' | 'farm_id' | 'created_at'>,
    piglets?: PigletBatchItem[]
  ): BirthRecord {
    const births = this.getBirthRecords();
    const farm = this.getFarm();
    const sow = this.getPigById(birthData.sow_id);
    if (!sow) throw new Error('Mother sow record not found');

    const newBirth: BirthRecord = {
      ...birthData,
      id: `birth-${Date.now()}`,
      farm_id: farm.id,
      recorded_by: this.currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    births.unshift(newBirth);
    setStorage(STORAGE_KEYS.BIRTHS, births);

    // Update sow status to Active (delivered)
    this.updatePig(sow.id, { status: 'Active' });

    // If linked to breeding record, mark it as Delivered
    if (birthData.breeding_id) {
      try {
        this.updateBreedingRecord(birthData.breeding_id, {
          status: 'Delivered',
          actual_delivery_date: birthData.birth_date,
        });
      } catch (e) {
        console.warn('Could not update linked breeding record:', e);
      }
    }

    // Automatically register batch piglets if provided
    if (piglets && piglets.length > 0) {
      for (const p of piglets) {
        try {
          this.addPig({
            pig_id: p.pig_id,
            breed: `${sow.breed} Cross`,
            sex: p.sex,
            dob: birthData.birth_date,
            source: 'Born on Farm',
            current_weight: p.weight || 1.4,
            pen_location: p.pen_location || 'Nursery Pen 1',
            status: 'Active',
            mother_id: sow.id,
            mother_tag: sow.pig_id,
            father_id: birthData.boar_id,
            father_tag: birthData.boar_tag,
            notes: `Farrowing litter. ${p.notes || ''}`.trim(),
          });
        } catch (err) {
          console.warn(`Piglet ${p.pig_id} registration note:`, err);
        }
      }
    }

    return newBirth;
  }

  // Health Management
  public getHealthRecords(pigId?: string): HealthRecord[] {
    const records = getStorage<HealthRecord[]>(STORAGE_KEYS.HEALTH, initialHealthRecords);
    if (pigId) {
      return records.filter((r) => r.pig_id === pigId).sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
    }
    return records.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  }

  public addHealthRecord(
    recordData: Omit<HealthRecord, 'id' | 'farm_id' | 'created_at'>,
    options?: { deductMedicineStock?: boolean; logExpense?: boolean }
  ): HealthRecord {
    const health = this.getHealthRecords();
    const farm = this.getFarm();
    const pig = this.getPigById(recordData.pig_id);
    if (!pig) throw new Error('Pig record not found');

    const newRecord: HealthRecord = {
      ...recordData,
      pig_tag: pig.pig_id,
      id: `hr-${Date.now()}`,
      farm_id: farm.id,
      recorded_by: this.currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    health.unshift(newRecord);
    setStorage(STORAGE_KEYS.HEALTH, health);

    // If pig has active disease/treatment, update its status to 'Sick'
    if (recordData.type === 'Disease' || (recordData.type === 'Treatment' && pig.status !== 'Pregnant')) {
      this.updatePig(pig.id, { status: 'Sick' });
    }

    // Deduct medicine stock if requested and medicine exists
    if (options?.deductMedicineStock && recordData.medicine_id) {
      try {
        const medicines = this.getMedicines();
        const medIndex = medicines.findIndex((m) => m.id === recordData.medicine_id);
        if (medIndex !== -1 && medicines[medIndex].quantity > 0) {
          medicines[medIndex].quantity = Math.max(0, medicines[medIndex].quantity - 1);
          setStorage(STORAGE_KEYS.MEDICINES, medicines);
        }
      } catch (err) {
        console.warn('Could not deduct medicine stock:', err);
      }
    }

    // Log cost to expenses if requested and cost > 0
    if (options?.logExpense && recordData.cost > 0) {
      try {
        this.addExpense({
          date: recordData.record_date,
          category: recordData.type === 'Vaccination' ? 'Vaccination' : 'Veterinary',
          amount: recordData.cost,
          description: `${recordData.type} for Pig ${pig.pig_id}: ${recordData.condition}`,
          supplier_payee: recordData.veterinarian || 'Veterinary Care',
          payment_method: 'Cash',
          notes: recordData.notes,
        });
      } catch (err) {
        console.warn('Could not auto-log health expense:', err);
      }
    }

    return newRecord;
  }

  // Medicines
  public getMedicines(): Medicine[] {
    return getStorage<Medicine[]>(STORAGE_KEYS.MEDICINES, initialMedicines);
  }

  public addMedicine(data: Omit<Medicine, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Medicine {
    const medicines = this.getMedicines();
    const farm = this.getFarm();
    const now = new Date().toISOString();
    const newMed: Medicine = {
      ...data,
      id: `med-${Date.now()}`,
      farm_id: farm.id,
      created_at: now,
      updated_at: now,
    };
    medicines.unshift(newMed);
    setStorage(STORAGE_KEYS.MEDICINES, medicines);

    // Auto-record purchase in expenses if cost > 0
    if (newMed.cost > 0) {
      try {
        this.addExpense({
          date: newMed.purchase_date || now.split('T')[0],
          category: 'Medicine',
          amount: newMed.cost,
          description: `Medicine Purchase: ${newMed.name} (${newMed.quantity} ${newMed.unit})`,
          supplier_payee: newMed.supplier || 'Medical Supplier',
          payment_method: 'Bank Transfer',
        });
      } catch (e) {
        console.warn('Failed to log medicine purchase expense:', e);
      }
    }

    return newMed;
  }

  public updateMedicine(id: string, updates: Partial<Medicine>): Medicine {
    const medicines = this.getMedicines();
    const index = medicines.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Medicine record not found');
    const updated = {
      ...medicines[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    medicines[index] = updated;
    setStorage(STORAGE_KEYS.MEDICINES, medicines);
    return updated;
  }

  public deleteMedicine(id: string): void {
    const medicines = this.getMedicines().filter((m) => m.id !== id);
    setStorage(STORAGE_KEYS.MEDICINES, medicines);
  }

  public deductMedicineStock(medicineId: string, quantity: number = 1): void {
    const medicines = this.getMedicines();
    const idx = medicines.findIndex((m) => m.id === medicineId);
    if (idx !== -1) {
      medicines[idx].quantity = Math.max(0, medicines[idx].quantity - quantity);
      setStorage(STORAGE_KEYS.MEDICINES, medicines);
    }
  }

  // Feed Management
  public getFeedItems(): FeedItem[] {
    return getStorage<FeedItem[]>(STORAGE_KEYS.FEED_ITEMS, initialFeedItems);
  }

  public addFeedItem(data: Omit<FeedItem, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): FeedItem {
    const feeds = this.getFeedItems();
    const farm = this.getFarm();
    const now = new Date().toISOString();
    const newFeed: FeedItem = {
      ...data,
      id: `feed-${Date.now()}`,
      farm_id: farm.id,
      created_at: now,
      updated_at: now,
    };
    feeds.unshift(newFeed);
    setStorage(STORAGE_KEYS.FEED_ITEMS, feeds);
    return newFeed;
  }

  public updateFeedItem(id: string, updates: Partial<FeedItem>): FeedItem {
    const feeds = this.getFeedItems();
    const index = feeds.findIndex((f) => f.id === id);
    if (index === -1) throw new Error('Feed item not found');
    const updated = { ...feeds[index], ...updates, updated_at: new Date().toISOString() };
    feeds[index] = updated;
    setStorage(STORAGE_KEYS.FEED_ITEMS, feeds);
    return updated;
  }

  public getFeedTransactions(): FeedTransaction[] {
    return getStorage<FeedTransaction[]>(STORAGE_KEYS.FEED_TX, initialFeedTransactions).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  public getFeedPurchases(): FeedTransaction[] {
    return this.getFeedTransactions().filter((t) => t.type === 'purchase');
  }

  public recordFeedPurchase(data: {
    feed_item_id?: string;
    feed_id?: string;
    quantity?: number;
    cost?: number;
    total_amount?: number;
    date?: string;
    purchase_date?: string;
    notes?: string;
    [key: string]: any;
  }): FeedTransaction {
    const feedId = data.feed_item_id || data.feed_id;
    const qty = data.quantity ?? 0;
    const cost = data.cost ?? data.total_amount ?? 0;
    const date = data.date || data.purchase_date || new Date().toISOString().split('T')[0];

    if (qty <= 0) throw new Error('Purchase quantity must be greater than zero.');
    const feeds = this.getFeedItems();
    const feed = feeds.find((f) => f.id === feedId);
    if (!feed) throw new Error('Feed item not found');

    const farm = this.getFarm();
    const txs = this.getFeedTransactions();

    // Increase feed inventory
    const newQty = feed.quantity + qty;
    this.updateFeedItem(feed.id, { quantity: newQty });

    const newTx: FeedTransaction = {
      id: `ft-${Date.now()}`,
      farm_id: farm.id,
      feed_item_id: feed.id,
      feed_name: feed.name,
      type: 'purchase',
      quantity: qty,
      cost,
      supplier: data.supplier,
      unit: data.unit || feed.unit,
      unit_price: data.unit_price,
      total_amount: data.total_amount ?? cost,
      purchase_date: date,
      invoice_number: data.invoice_number,
      payment_method: data.payment_method,
      date,
      notes: data.notes,
      recorded_by: this.currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    txs.unshift(newTx);
    setStorage(STORAGE_KEYS.FEED_TX, txs);

    // Auto-record expense
    if (cost > 0) {
      try {
        this.addExpense({
          date,
          category: 'Feed',
          amount: cost,
          description: `Feed Purchase: ${feed.name} (${qty} kg)`,
          supplier_payee: data.supplier || feed.supplier || 'Feed Mill',
          payment_method: data.payment_method || 'Bank Transfer',
          notes: data.notes,
        });
      } catch (err) {
        console.warn('Could not auto-record feed expense:', err);
      }
    }

    return newTx;
  }

  public recordFeedUsage(data: {
    feed_item_id?: string;
    feed_id?: string;
    quantity?: number;
    quantity_used?: number;
    date?: string;
    usage_date?: string;
    notes?: string;
    [key: string]: any;
  }): FeedTransaction {
    const feedId = data.feed_item_id || data.feed_id;
    const qty = data.quantity ?? data.quantity_used ?? 0;
    const date = data.date || data.usage_date || new Date().toISOString().split('T')[0];

    if (qty <= 0) throw new Error('Feed usage quantity must be greater than zero.');
    const feeds = this.getFeedItems();
    const feed = feeds.find((f) => f.id === feedId);
    if (!feed) throw new Error('Feed item not found');

    if (feed.quantity < qty) {
      throw new Error(
        `Insufficient feed in stock. Available: ${feed.quantity} ${feed.unit}, Requested: ${qty} ${feed.unit}. Inventory cannot become negative.`
      );
    }

    const farm = this.getFarm();
    const txs = this.getFeedTransactions();

    // Decrease feed inventory
    const newQty = feed.quantity - qty;
    this.updateFeedItem(feed.id, { quantity: newQty });

    const newTx: FeedTransaction = {
      id: `ft-${Date.now()}`,
      farm_id: farm.id,
      feed_item_id: feed.id,
      feed_name: feed.name,
      type: 'usage',
      quantity: qty,
      cost: Number((qty * feed.cost_per_unit).toFixed(2)),
      date,
      notes: data.notes,
      recorded_by: this.currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    txs.unshift(newTx);
    setStorage(STORAGE_KEYS.FEED_TX, txs);
    return newTx;
  }

  // General Inventory
  public getInventoryItems(): InventoryItem[] {
    return getStorage<InventoryItem[]>(STORAGE_KEYS.INVENTORY, initialInventoryItems);
  }

  public getGeneralInventory(): InventoryItem[] {
    return this.getInventoryItems();
  }

  public addInventoryItem(data: Omit<InventoryItem, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): InventoryItem {
    const items = this.getInventoryItems();
    const farm = this.getFarm();
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...data,
      id: `inv-${Date.now()}`,
      farm_id: farm.id,
      created_at: now,
      updated_at: now,
    };
    items.unshift(newItem);
    setStorage(STORAGE_KEYS.INVENTORY, items);
    return newItem;
  }

  public addGeneralInventoryItem(data: Omit<InventoryItem, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): InventoryItem {
    return this.addInventoryItem(data);
  }

  public updateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem {
    const items = this.getInventoryItems();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Inventory item not found');
    const updated = { ...items[index], ...updates, updated_at: new Date().toISOString() };
    items[index] = updated;
    setStorage(STORAGE_KEYS.INVENTORY, items);
    return updated;
  }

  // Customers
  public getCustomers(): Customer[] {
    return getStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
  }

  public addCustomer(data: Omit<Customer, 'id' | 'farm_id' | 'created_at' | 'updated_at'>): Customer {
    const customers = this.getCustomers();
    const farm = this.getFarm();
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...data,
      id: `cust-${Date.now()}`,
      farm_id: farm.id,
      created_at: now,
      updated_at: now,
    };
    customers.unshift(newCustomer);
    setStorage(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer record not found');
    const updated = { ...customers[index], ...updates, updated_at: new Date().toISOString() };
    customers[index] = updated;
    setStorage(STORAGE_KEYS.CUSTOMERS, customers);
    return updated;
  }

  // Sales Module
  public getSales(): Sale[] {
    return getStorage<Sale[]>(STORAGE_KEYS.SALES, initialSales).sort(
      (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    );
  }

  public addSale(data: {
    sale_date: string;
    customer_id?: string;
    pig_id?: string;
    pig_ids?: string[];
    pig_code?: string;
    weight: number;
    price_per_kg: number;
    payment_status: Sale['payment_status'];
    payment_method: Sale['payment_method'];
    notes?: string;
  }): Sale {
    if (data.weight <= 0) throw new Error('Weight must be greater than zero.');
    if (data.price_per_kg <= 0) throw new Error('Price per kg must be greater than zero.');

    const sales = this.getSales();
    const farm = this.getFarm();
    const total_amount = Number((data.weight * data.price_per_kg).toFixed(2));

    let customerName = 'Walk-in / Cash Buyer';
    if (data.customer_id) {
      const cust = this.getCustomers().find((c) => c.id === data.customer_id);
      if (cust) customerName = cust.name;
    }

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      farm_id: farm.id,
      sale_date: data.sale_date,
      customer_id: data.customer_id,
      customer_name: customerName,
      pig_id: data.pig_id,
      pig_ids: data.pig_ids,
      pig_code: data.pig_code,
      weight: data.weight,
      price_per_kg: data.price_per_kg,
      total_amount,
      payment_status: data.payment_status,
      payment_method: data.payment_method,
      notes: data.notes,
      recorded_by: this.currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    sales.unshift(newSale);
    setStorage(STORAGE_KEYS.SALES, sales);

    // Update single pig status to Sold
    if (data.pig_id) {
      try {
        this.updatePig(data.pig_id, { status: 'Sold' });
      } catch (err) {
        console.warn('Could not update pig status to Sold:', err);
      }
    }

    // Update batch pigs to Sold
    if (data.pig_ids && data.pig_ids.length > 0) {
      for (const pid of data.pig_ids) {
        try {
          this.updatePig(pid, { status: 'Sold' });
        } catch (err) {
          console.warn(`Could not update pig ${pid} status:`, err);
        }
      }
    }

    return newSale;
  }

  public recordSale(data: any): Sale {
    return this.addSale(data);
  }

  // Expense Management
  public getExpenses(): Expense[] {
    return getStorage<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  public addExpense(data: Omit<Expense, 'id' | 'farm_id' | 'created_at'>): Expense {
    if (data.amount <= 0) throw new Error('Expense amount must be greater than zero.');
    const expenses = this.getExpenses();
    const farm = this.getFarm();
    const newExpense: Expense = {
      ...data,
      id: `exp-${Date.now()}`,
      farm_id: farm.id,
      recorded_by: this.currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    expenses.unshift(newExpense);
    setStorage(STORAGE_KEYS.EXPENSES, expenses);
    return newExpense;
  }

  // Dynamic Dashboard Stats (Calculated strictly from real database records)
  public getDashboardStats(): FarmDashboardStats {
    const pigs = this.getPigs();
    const sales = this.getSales();
    const expenses = this.getExpenses();
    const feeds = this.getFeedItems();
    const medicines = this.getMedicines();
    const breeding = this.getBreedingRecords();

    // Active pigs are those with status not 'Sold', 'Dead', or 'Removed'
    const activePigs = pigs.filter((p) => p.status === 'Active' || p.status === 'Pregnant' || p.status === 'Sick');
    const malePigs = activePigs.filter((p) => p.sex === 'Male');
    const femalePigs = activePigs.filter((p) => p.sex === 'Female');

    // Piglets are defined as pigs weighing <= 20kg or born within the last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const piglets = activePigs.filter(
      (p) => p.current_weight <= 20 || new Date(p.dob) >= sixtyDaysAgo
    );

    // Breeding sows are active females weighing > 100kg or marked pregnant
    const breedingSows = femalePigs.filter((p) => p.current_weight >= 90 || p.status === 'Pregnant');
    const pregnantSows = femalePigs.filter((p) => p.status === 'Pregnant');

    // Ready for sale: active non-breeding pigs with market weight >= 85kg
    const readyForSale = activePigs.filter(
      (p) => p.current_weight >= 85 && p.status === 'Active' && !breedingSows.some((b) => b.id === p.id)
    );

    // Date filters for sales and expenses
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    const todaySales = sales
      .filter((s) => s.sale_date === todayStr)
      .reduce((sum, s) => sum + s.total_amount, 0);

    const todayExpenses = expenses
      .filter((e) => e.date === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);

    const thisMonthSales = sales
      .filter((s) => s.sale_date.startsWith(currentMonthPrefix))
      .reduce((sum, s) => sum + s.total_amount, 0);

    const thisMonthExpenses = expenses
      .filter((e) => e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);

    const netProfit = thisMonthSales - thisMonthExpenses;

    // Inventory alerts
    const lowFeedCount = feeds.filter((f) => f.quantity <= f.min_stock).length;
    const lowMedicineCount = medicines.filter((m) => m.quantity <= m.min_stock).length;

    // Expiring within 45 days
    const in45Days = new Date();
    in45Days.setDate(in45Days.getDate() + 45);
    const expiringMedicinesCount = medicines.filter(
      (m) => new Date(m.expiry_date) <= in45Days
    ).length;

    // Upcoming deliveries in next 14 days
    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);
    const now = new Date();
    const upcomingDeliveriesCount = breeding.filter(
      (b) =>
        b.status === 'Pregnant' &&
        new Date(b.expected_delivery_date) >= now &&
        new Date(b.expected_delivery_date) <= in14Days
    ).length;

    return {
      totalPigs: activePigs.length,
      malePigs: malePigs.length,
      femalePigs: femalePigs.length,
      piglets: piglets.length,
      breedingSows: breedingSows.length,
      pregnantSows: pregnantSows.length,
      readyForSale: readyForSale.length,
      todaySales,
      todayExpenses,
      thisMonthSales,
      thisMonthExpenses,
      netProfit,
      lowFeedCount,
      lowMedicineCount,
      expiringMedicinesCount,
      upcomingDeliveriesCount,
    };
  }

  // Reset database back to pristine initial state
  public resetToSeedData(): void {
    setStorage(STORAGE_KEYS.FARM, initialFarm);
    setStorage(STORAGE_KEYS.PROFILES, initialProfiles);
    setStorage(STORAGE_KEYS.PIGS, initialPigs);
    setStorage(STORAGE_KEYS.WEIGHTS, initialWeights);
    setStorage(STORAGE_KEYS.BREEDING, initialBreedingRecords);
    setStorage(STORAGE_KEYS.BIRTHS, initialBirthRecords);
    setStorage(STORAGE_KEYS.MEDICINES, initialMedicines);
    setStorage(STORAGE_KEYS.HEALTH, initialHealthRecords);
    setStorage(STORAGE_KEYS.FEED_ITEMS, initialFeedItems);
    setStorage(STORAGE_KEYS.FEED_TX, initialFeedTransactions);
    setStorage(STORAGE_KEYS.INVENTORY, initialInventoryItems);
    setStorage(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    setStorage(STORAGE_KEYS.SALES, initialSales);
    setStorage(STORAGE_KEYS.EXPENSES, initialExpenses);
    setStorage(STORAGE_KEYS.CURRENT_USER, initialProfiles[0]);
    setStorage(STORAGE_KEYS.PENS, initialPens);
    this.currentUser = initialProfiles[0];
  }

  public resetToInitialDemoData(): void {
    this.resetToSeedData();
  }

  // Backup export
  public exportDataJSON(): string {
    const data = {
      farm: this.getFarm(),
      profiles: this.getProfiles(),
      pigs: this.getPigs(),
      weights: this.getWeights(),
      breeding: this.getBreedingRecords(),
      births: this.getBirthRecords(),
      medicines: this.getMedicines(),
      health: this.getHealthRecords(),
      feedItems: this.getFeedItems(),
      feedTransactions: this.getFeedTransactions(),
      inventory: this.getInventoryItems(),
      customers: this.getCustomers(),
      sales: this.getSales(),
      expenses: this.getExpenses(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }
}

export const db = new FarmDatabase();
