-- ==============================================================================
-- INFRA AGENT — SUPABASE DATABASE MIGRATION: 002_storage_and_rls.sql
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmentation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiothermal_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;


-- 2. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- 3. INSPECTIONS POLICIES
DROP POLICY IF EXISTS "Users can view own inspections" ON public.inspections;
CREATE POLICY "Users can view own inspections"
  ON public.inspections FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inspections" ON public.inspections;
CREATE POLICY "Users can insert own inspections"
  ON public.inspections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inspections" ON public.inspections;
CREATE POLICY "Users can update own inspections"
  ON public.inspections FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own inspections" ON public.inspections;
CREATE POLICY "Users can delete own inspections"
  ON public.inspections FOR DELETE
  USING (auth.uid() = user_id);


-- 4. CHILD TABLE POLICIES (Linked through inspection_id ownership)

-- helper policy function or direct join check
CREATE POLICY "Users can manage own inspection images"
  ON public.inspection_images FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own detections"
  ON public.detections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = detections.inspection_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own segmentation results"
  ON public.segmentation_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = segmentation_results.inspection_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own measurements"
  ON public.measurements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = measurements.inspection_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own risk assessments"
  ON public.risk_assessments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = risk_assessments.inspection_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own radiothermal results"
  ON public.radiothermal_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = radiothermal_results.inspection_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own maintenance recommendations"
  ON public.maintenance_recommendations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = maintenance_recommendations.inspection_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own reports"
  ON public.reports FOR ALL
  USING (auth.uid() = user_id);


-- 5. STORAGE BUCKETS CREATION
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('inspection-images', 'inspection-images', false),
  ('processed-images', 'processed-images', false),
  ('reports', 'reports', false),
  ('profile-images', 'profile-images', false)
ON CONFLICT (id) DO NOTHING;


-- 6. STORAGE POLICIES
CREATE POLICY "Users can upload own inspection images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inspection-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own inspection images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'inspection-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own processed images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'processed-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own processed images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'processed-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own avatar"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
