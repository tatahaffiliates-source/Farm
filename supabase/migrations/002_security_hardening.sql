-- Security hardening for production authentication and farm-scoped RBAC.
-- Apply after 001_initial_schema.sql. No service-role key is used by the browser.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_user_farm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT farm_id FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_farm_member(target_farm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT target_farm_id IS NOT NULL
    AND target_farm_id = public.get_user_farm_id()
    AND public.get_user_role() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    'worker',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
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

-- Replace the original policies so every operation is farm-scoped and role-scoped.
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'farms', 'profiles', 'pigs', 'pig_weights', 'breeding_records',
        'birth_records', 'medicines', 'health_records', 'feed_items',
        'feed_transactions', 'inventory_items', 'customers', 'sales', 'expenses'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END;
$$;

CREATE POLICY health_records_insert_worker ON public.health_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_farm_member(farm_id) AND recorded_by = (SELECT auth.uid()));

CREATE POLICY feed_transactions_insert_worker ON public.feed_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_farm_member(farm_id) AND recorded_by = (SELECT auth.uid()));

CREATE POLICY profiles_select_same_farm ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR public.is_farm_member(farm_id));

CREATE POLICY profiles_update_by_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'admin'
    AND public.is_farm_member(farm_id)
    AND id <> (SELECT auth.uid())
  )
  WITH CHECK (
    public.get_user_role() = 'admin'
    AND public.is_farm_member(farm_id)
    AND role IN ('admin', 'manager', 'worker')
  );

CREATE POLICY farms_select_member ON public.farms
  FOR SELECT TO authenticated USING (id = public.get_user_farm_id());
CREATE POLICY farms_update_admin ON public.farms
  FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND id = public.get_user_farm_id())
  WITH CHECK (id = public.get_user_farm_id());

CREATE POLICY pigs_select_member ON public.pigs FOR SELECT TO authenticated USING (public.is_farm_member(farm_id));
CREATE POLICY pigs_insert_operations ON public.pigs FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id));
CREATE POLICY pigs_update_operations ON public.pigs FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id))
  WITH CHECK (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id));
CREATE POLICY pigs_delete_admin ON public.pigs FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin' AND public.is_farm_member(farm_id));

CREATE POLICY pig_weights_select_member ON public.pig_weights FOR SELECT TO authenticated USING (public.is_farm_member(farm_id));
CREATE POLICY pig_weights_insert_member ON public.pig_weights FOR INSERT TO authenticated
  WITH CHECK (public.is_farm_member(farm_id) AND recorded_by = (SELECT auth.uid()));
CREATE POLICY pig_weights_update_manager ON public.pig_weights FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id))
  WITH CHECK (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id));
CREATE POLICY pig_weights_delete_admin ON public.pig_weights FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin' AND public.is_farm_member(farm_id));

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['breeding_records','birth_records','medicines','health_records','feed_items','feed_transactions','inventory_items','customers']
  LOOP
    EXECUTE format('CREATE POLICY %I_select_member ON public.%I FOR SELECT TO authenticated USING (public.is_farm_member(farm_id))', table_name, table_name);
    EXECUTE format('CREATE POLICY %I_insert_operations ON public.%I FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN (''admin'', ''manager'') AND public.is_farm_member(farm_id))', table_name, table_name);
    EXECUTE format('CREATE POLICY %I_update_operations ON public.%I FOR UPDATE TO authenticated USING (public.get_user_role() IN (''admin'', ''manager'') AND public.is_farm_member(farm_id)) WITH CHECK (public.get_user_role() IN (''admin'', ''manager'') AND public.is_farm_member(farm_id))', table_name, table_name);
    EXECUTE format('CREATE POLICY %I_delete_admin ON public.%I FOR DELETE TO authenticated USING (public.get_user_role() = ''admin'' AND public.is_farm_member(farm_id))', table_name, table_name);
  END LOOP;
END;
$$;

CREATE POLICY sales_select_manager ON public.sales FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id));
CREATE POLICY sales_insert_manager ON public.sales FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id) AND recorded_by = (SELECT auth.uid()));
CREATE POLICY sales_update_manager ON public.sales FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id))
  WITH CHECK (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id));
CREATE POLICY sales_delete_admin ON public.sales FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin' AND public.is_farm_member(farm_id));

CREATE POLICY expenses_select_manager ON public.expenses FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id));
CREATE POLICY expenses_insert_manager ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id) AND recorded_by = (SELECT auth.uid()));
CREATE POLICY expenses_update_manager ON public.expenses FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager') AND public.is_farm_member(farm_id));
CREATE POLICY expenses_delete_admin ON public.expenses FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin' AND public.is_farm_member(farm_id));

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_farm_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_farm_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_farm_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_farm_member(uuid) TO authenticated;
