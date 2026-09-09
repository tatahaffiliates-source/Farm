export type UserRole = 'admin' | 'manager' | 'worker';

export type PigStatus = 'Active' | 'Pregnant' | 'Sick' | 'Sold' | 'Dead' | 'Transferred' | 'Removed';
export type PigSex = 'Male' | 'Female';

export type BreedingStatus = 'Planned' | 'Mated' | 'Pregnant' | 'Delivered' | 'Failed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Partial' | 'Pending';

export type HealthType = 'Vaccination' | 'Deworming' | 'Disease' | 'Treatment' | 'Vet Visit';

export type ExpenseCategory =
  | 'Feed'
  | 'Medicine'
  | 'Vaccination'
  | 'Labour'
  | 'Electricity'
  | 'Water'
  | 'Transportation'
  | 'Repairs'
  | 'Equipment'
  | 'Veterinary'
  | 'Pig purchase'
  | 'Farm maintenance'
  | 'Other';

export interface UserProfile {
  id: string;
  farm_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'disabled';
  phone?: string;
  created_at: string;
}

export interface Farm {
  id: string;
  name: string;
  farm_name?: string;
  owner_name?: string;
  location: string;
  address?: string;
  currency: string;
  currency_symbol: string;
  weight_unit: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface Pig {
  id: string;
  farm_id: string;
  pig_id: string; // e.g. P-0001
  tag_number?: string;
  breed: string;
  sex: PigSex;
  dob: string;
  source: 'Born on Farm' | 'Purchased';
  purchase_date?: string;
  purchase_price?: number;
  current_weight: number;
  pen_location: string;
  status: PigStatus;
  father_id?: string;
  father_tag?: string;
  mother_id?: string;
  mother_tag?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PigWeight {
  id: string;
  farm_id: string;
  pig_id: string;
  record_date: string;
  weight: number;
  weight_gained?: number;
  growth_rate?: number; // percentage
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface BreedingRecord {
  id: string;
  farm_id: string;
  sow_id: string;
  sow_tag?: string;
  boar_id?: string;
  boar_tag?: string;
  mating_date: string;
  expected_delivery_date: string;
  actual_delivery_date?: string;
  status: BreedingStatus;
  service_type?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BirthRecord {
  id: string;
  farm_id: string;
  breeding_id?: string;
  breeding_record_id?: string;
  sow_id: string;
  sow_tag?: string;
  boar_id?: string;
  boar_tag?: string;
  birth_date: string;
  number_born: number;
  piglets_born?: number;
  number_alive: number;
  piglets_born_alive?: number;
  number_stillborn: number;
  number_currently_alive: number;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface PigletBatchItem {
  pig_id: string;
  sex: PigSex;
  weight: number;
  pen_location: string;
  notes?: string;
}

export interface Medicine {
  id: string;
  farm_id: string;
  name: string;
  category: 'Vaccine' | 'Antibiotic' | 'Dewormer' | 'Vitamin/Supplement' | 'Antiseptic' | 'Other';
  quantity: number;
  current_stock?: number;
  unit: string;
  purchase_date?: string;
  expiry_date: string;
  supplier?: string;
  cost: number;
  cost_per_unit?: number;
  min_stock: number;
  min_stock_level?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthRecord {
  id: string;
  farm_id: string;
  pig_id: string;
  pig_tag?: string;
  record_date: string;
  type: HealthType;
  condition: string;
  symptoms?: string;
  treatment?: string;
  medicine_id?: string;
  medicine_name?: string;
  dosage?: string;
  route_of_admin?: string;
  veterinarian?: string;
  cost: number;
  follow_up_date?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface FeedItem {
  id: string;
  farm_id: string;
  name: string;
  feed_type: 'Starter feed' | 'Grower feed' | 'Finisher feed' | 'Sow feed' | 'Creep feed' | 'Other';
  type?: string;
  quantity: number; // in kg
  current_stock?: number;
  unit: string;
  cost_per_unit: number;
  supplier?: string;
  purchase_date?: string;
  min_stock: number;
  min_stock_level?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FeedTransaction {
  id: string;
  farm_id: string;
  feed_item_id: string;
  feed_name?: string;
  type: 'purchase' | 'usage';
  quantity: number; // kg
  cost: number;
  date: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  farm_id: string;
  item_name: string;
  name?: string;
  category: 'Equipment' | 'Tool' | 'Bedding' | 'Sanitation' | 'Safety' | 'General';
  quantity: number;
  unit: string;
  cost: number;
  supplier?: string;
  min_stock: number;
  min_stock_level?: number;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  farm_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  customer_type?: 'Wholesale Buyer' | 'Retailer' | 'Butcher' | 'Individual';
  type?: 'Wholesale Buyer' | 'Retailer' | 'Butcher' | 'Individual';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  farm_id: string;
  sale_date: string;
  customer_id?: string;
  customer_name?: string;
  pig_id?: string;
  pig_code?: string;
  pig_ids?: string[];
  weight: number;
  price_per_kg: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  farm_id: string;
  date: string;
  expense_date?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  supplier_payee?: string;
  payee?: string;
  receipt_number?: string;
  payment_method: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Card';
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Card';
export type CustomerType = 'Wholesale Buyer' | 'Retailer' | 'Butcher' | 'Individual';
export type MedicineCategory = 'Vaccine' | 'Antibiotic' | 'Dewormer' | 'Vitamin/Supplement' | 'Antiseptic' | 'Other';
export type InventoryCategory = 'Equipment' | 'Tool' | 'Bedding' | 'Sanitation' | 'Safety' | 'General';
export type HealthRecordType = HealthType;

export type PenType =
  | 'Breeding'
  | 'Gestation'
  | 'Farrowing'
  | 'Nursery'
  | 'Grower'
  | 'Finisher'
  | 'Quarantine'
  | 'Isolation';

export type PenStatus = 'Active' | 'Full' | 'Cleaning' | 'Maintenance' | 'Empty';

export interface Pen {
  id: string;
  name: string;
  type: PenType;
  capacity: number;
  current_occupancy: number;
  status: PenStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type FarmSettings = Farm;
export type FeedPurchase = FeedTransaction;
export type GeneralInventoryItem = InventoryItem;

export interface FarmDashboardStats {
  totalPigs: number;
  malePigs: number;
  femalePigs: number;
  piglets: number;
  breedingSows: number;
  pregnantSows: number;
  readyForSale: number;
  todaySales: number;
  todayExpenses: number;
  thisMonthSales: number;
  thisMonthExpenses: number;
  netProfit: number;
  lowFeedCount: number;
  lowMedicineCount: number;
  expiringMedicinesCount: number;
  upcomingDeliveriesCount: number;
}
