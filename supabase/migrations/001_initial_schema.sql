-- ==============================================================================
-- PIG FARM MANAGEMENT SYSTEM - PRODUCTION POSTGRESQL SCHEMA & RLS POLICIES
-- Target: Supabase / PostgreSQL 15+
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'worker');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pig_status AS ENUM ('Active', 'Pregnant', 'Sick', 'Sold', 'Dead', 'Transferred', 'Removed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pig_sex AS ENUM ('Male', 'Female');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE breeding_status AS ENUM ('Planned', 'Mated', 'Pregnant', 'Delivered', 'Failed', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('Paid', 'Partial', 'Pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. FARMS TABLE
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'INR',
    currency_symbol VARCHAR(10) DEFAULT '₹',
    weight_unit VARCHAR(10) DEFAULT 'kg',
    phone VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'worker',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PIGS (LIVESTOCK) TABLE
CREATE TABLE IF NOT EXISTS public.pigs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    pig_id VARCHAR(50) NOT NULL,
    tag_number VARCHAR(50),
    breed VARCHAR(100) NOT NULL,
    sex pig_sex NOT NULL,
    dob DATE NOT NULL,
    source VARCHAR(50) DEFAULT 'Born on Farm', -- 'Born on Farm', 'Purchased'
    purchase_date DATE,
    purchase_price NUMERIC(12, 2) DEFAULT 0,
    current_weight NUMERIC(8, 2) NOT NULL,
    pen_location VARCHAR(100) NOT NULL,
    status pig_status NOT NULL DEFAULT 'Active',
    father_id UUID REFERENCES public.pigs(id) ON DELETE SET NULL,
    mother_id UUID REFERENCES public.pigs(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(farm_id, pig_id)
);

CREATE INDEX IF NOT EXISTS idx_pigs_farm_status ON public.pigs(farm_id, status);
CREATE INDEX IF NOT EXISTS idx_pigs_pig_id ON public.pigs(pig_id);

-- 5. PIG WEIGHTS TABLE
CREATE TABLE IF NOT EXISTS public.pig_weights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    pig_id UUID NOT NULL REFERENCES public.pigs(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    weight NUMERIC(8, 2) NOT NULL,
    weight_gained NUMERIC(8, 2) DEFAULT 0,
    growth_rate NUMERIC(8, 2) DEFAULT 0,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pig_weights_pig_date ON public.pig_weights(pig_id, record_date);

-- 6. BREEDING RECORDS
CREATE TABLE IF NOT EXISTS public.breeding_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    sow_id UUID NOT NULL REFERENCES public.pigs(id) ON DELETE CASCADE,
    boar_id UUID REFERENCES public.pigs(id) ON DELETE SET NULL,
    mating_date DATE NOT NULL,
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    status breeding_status NOT NULL DEFAULT 'Mated',
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BIRTH RECORDS & PIGLETS
CREATE TABLE IF NOT EXISTS public.birth_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    breeding_id UUID REFERENCES public.breeding_records(id) ON DELETE SET NULL,
    sow_id UUID NOT NULL REFERENCES public.pigs(id) ON DELETE CASCADE,
    boar_id UUID REFERENCES public.pigs(id) ON DELETE SET NULL,
    birth_date DATE NOT NULL,
    number_born INT NOT NULL CHECK (number_born >= 0),
    number_alive INT NOT NULL CHECK (number_alive >= 0),
    number_stillborn INT NOT NULL DEFAULT 0 CHECK (number_stillborn >= 0),
    number_currently_alive INT NOT NULL CHECK (number_currently_alive >= 0),
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MEDICINES TABLE
CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Vaccine', 'Antibiotic', 'Dewormer', 'Vitamin/Supplement', 'Antiseptic'
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL, -- 'ml', 'vials', 'tablets', 'doses'
    purchase_date DATE,
    expiry_date DATE NOT NULL,
    supplier VARCHAR(255),
    cost NUMERIC(12, 2) DEFAULT 0,
    min_stock NUMERIC(10, 2) NOT NULL DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. HEALTH RECORDS
CREATE TABLE IF NOT EXISTS public.health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    pig_id UUID NOT NULL REFERENCES public.pigs(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Vaccination', 'Deworming', 'Disease', 'Treatment', 'Vet Visit'
    condition VARCHAR(255) NOT NULL,
    symptoms TEXT,
    treatment TEXT,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
    dosage VARCHAR(100),
    veterinarian VARCHAR(255),
    cost NUMERIC(10, 2) DEFAULT 0,
    follow_up_date DATE,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. FEED ITEMS & TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.feed_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    feed_type VARCHAR(100) NOT NULL, -- 'Starter feed', 'Grower feed', 'Finisher feed', 'Sow feed', 'Creep feed'
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit VARCHAR(20) DEFAULT 'kg',
    cost_per_unit NUMERIC(10, 2) DEFAULT 0,
    supplier VARCHAR(255),
    purchase_date DATE,
    min_stock NUMERIC(10, 2) NOT NULL DEFAULT 100,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feed_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    feed_item_id UUID NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'usage')),
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    cost NUMERIC(12, 2) DEFAULT 0,
    date DATE NOT NULL,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. GENERAL FARM INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Equipment', 'Tool', 'Bedding', 'Sanitation', 'Safety'
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    cost NUMERIC(12, 2) DEFAULT 0,
    supplier VARCHAR(255),
    min_stock NUMERIC(10, 2) DEFAULT 2,
    location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    customer_type VARCHAR(50) DEFAULT 'Wholesale Buyer', -- 'Wholesale Buyer', 'Retailer', 'Butcher', 'Individual'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. SALES TABLE
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    pig_id UUID REFERENCES public.pigs(id) ON DELETE SET NULL,
    pig_ids TEXT[], -- Array of IDs if batch sale
    pig_code VARCHAR(100), -- Display code(s)
    weight NUMERIC(8, 2) NOT NULL,
    price_per_kg NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'Paid',
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer', -- 'Cash', 'Bank Transfer', 'UPI', 'Cheque'
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Feed', 'Medicine', 'Vaccination', 'Labour', 'Electricity', 'Water', 'Transportation', 'Repairs', 'Equipment', 'Veterinary', 'Pig purchase', 'Farm maintenance', 'Other'
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(255) NOT NULL,
    supplier_payee VARCHAR(255),
    payment_method VARCHAR(50) DEFAULT 'Cash',
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pig_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get the current user's farm_id
CREATE OR REPLACE FUNCTION public.get_user_farm_id()
RETURNS UUID AS $$
    SELECT farm_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view members of their own farm"
    ON public.profiles FOR SELECT
    USING (farm_id = public.get_user_farm_id() OR id = auth.uid());

CREATE POLICY "Admins can update users in their farm"
    ON public.profiles FOR UPDATE
    USING (public.get_user_role() = 'admin' AND farm_id = public.get_user_farm_id());

-- Pigs policies
CREATE POLICY "Farm members can view pigs"
    ON public.pigs FOR SELECT
    USING (farm_id = public.get_user_farm_id());

CREATE POLICY "Admin and manager can insert pigs"
    ON public.pigs FOR INSERT
    WITH CHECK (public.get_user_role() IN ('admin', 'manager') AND farm_id = public.get_user_farm_id());

CREATE POLICY "Admin and manager can update pigs"
    ON public.pigs FOR UPDATE
    USING (public.get_user_role() IN ('admin', 'manager') AND farm_id = public.get_user_farm_id());

CREATE POLICY "Admin can delete pigs"
    ON public.pigs FOR DELETE
    USING (public.get_user_role() = 'admin' AND farm_id = public.get_user_farm_id());

-- Weights policies
CREATE POLICY "All farm members can view and insert weights"
    ON public.pig_weights FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Sales policies (Workers cannot view or insert sales)
CREATE POLICY "Admin and manager can access sales"
    ON public.sales FOR ALL
    USING (public.get_user_role() IN ('admin', 'manager') AND farm_id = public.get_user_farm_id());

-- Expenses policies (Workers cannot view or insert expenses)
CREATE POLICY "Admin and manager can access expenses"
    ON public.expenses FOR ALL
    USING (public.get_user_role() IN ('admin', 'manager') AND farm_id = public.get_user_farm_id());
