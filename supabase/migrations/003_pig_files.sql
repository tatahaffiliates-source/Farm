-- Metadata for private files stored in the farm-files bucket.
CREATE TABLE IF NOT EXISTS public.pig_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  pig_id UUID NOT NULL REFERENCES public.pigs(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  bucket_name TEXT NOT NULL DEFAULT 'farm-files' CHECK (bucket_name = 'farm-files'),
  object_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pig_files_pig_created_at
  ON public.pig_files (pig_id, created_at DESC);

ALTER TABLE public.pig_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pig_files_select_same_farm ON public.pig_files;
CREATE POLICY pig_files_select_same_farm ON public.pig_files
  FOR SELECT TO authenticated
  USING (public.is_farm_member(farm_id));

DROP POLICY IF EXISTS pig_files_insert_same_farm ON public.pig_files;
CREATE POLICY pig_files_insert_same_farm ON public.pig_files
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND public.is_farm_member(farm_id)
    AND EXISTS (
      SELECT 1 FROM public.pigs
      WHERE public.pigs.id = pig_files.pig_id
        AND public.pigs.farm_id = pig_files.farm_id
    )
  );

DROP POLICY IF EXISTS pig_files_delete_admin ON public.pig_files;
CREATE POLICY pig_files_delete_admin ON public.pig_files
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin' AND public.is_farm_member(farm_id));

GRANT SELECT, INSERT, DELETE ON public.pig_files TO authenticated;
