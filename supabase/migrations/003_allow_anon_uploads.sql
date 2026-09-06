-- ==============================================================================
-- INFRA AGENT — SUPABASE DATABASE MIGRATION: 003_allow_anon_uploads.sql
-- Enables public & anonymous guest uploads to Storage & DB
-- ==============================================================================

-- 1. MAKE USER_ID NULLABLE FOR GUEST/DEMO INSPECTIONS
ALTER TABLE public.inspections ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.inspection_images ALTER COLUMN user_id DROP NOT NULL;

-- 2. PUBLIC & ANON POLICIES FOR INSPECTIONS TABLE
DROP POLICY IF EXISTS "Allow public and authenticated insert on inspections" ON public.inspections;
CREATE POLICY "Allow public and authenticated insert on inspections"
  ON public.inspections FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public and authenticated select on inspections" ON public.inspections;
CREATE POLICY "Allow public and authenticated select on inspections"
  ON public.inspections FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public and authenticated update on inspections" ON public.inspections;
CREATE POLICY "Allow public and authenticated update on inspections"
  ON public.inspections FOR UPDATE
  USING (true);

-- 3. PUBLIC & ANON POLICIES FOR INSPECTION IMAGES METADATA TABLE
DROP POLICY IF EXISTS "Allow public and authenticated all on inspection_images" ON public.inspection_images;
CREATE POLICY "Allow public and authenticated all on inspection_images"
  ON public.inspection_images FOR ALL
  USING (true);

-- 4. PUBLIC & ANON POLICIES FOR DETECTIONS & RESULTS TABLES
DROP POLICY IF EXISTS "Allow public management of detections" ON public.detections;
CREATE POLICY "Allow public management of detections"
  ON public.detections FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow public management of segmentation" ON public.segmentation_results;
CREATE POLICY "Allow public management of segmentation"
  ON public.segmentation_results FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow public management of measurements" ON public.measurements;
CREATE POLICY "Allow public management of measurements"
  ON public.measurements FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow public management of risk assessments" ON public.risk_assessments;
CREATE POLICY "Allow public management of risk assessments"
  ON public.risk_assessments FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow public management of radiothermal" ON public.radiothermal_results;
CREATE POLICY "Allow public management of radiothermal"
  ON public.radiothermal_results FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow public management of recommendations" ON public.maintenance_recommendations;
CREATE POLICY "Allow public management of recommendations"
  ON public.maintenance_recommendations FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow public management of reports" ON public.reports;
CREATE POLICY "Allow public management of reports"
  ON public.reports FOR ALL
  USING (true);

-- 5. ENSURE STORAGE BUCKETS ARE PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('inspection-images', 'inspection-images', true),
  ('processed-images', 'processed-images', true),
  ('reports', 'reports', true),
  ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. PUBLIC STORAGE POLICIES FOR OBJECTS BUCKETS
DROP POLICY IF EXISTS "Allow public upload to inspection-images" ON storage.objects;
CREATE POLICY "Allow public upload to inspection-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inspection-images');

DROP POLICY IF EXISTS "Allow public select from inspection-images" ON storage.objects;
CREATE POLICY "Allow public select from inspection-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-images');

DROP POLICY IF EXISTS "Allow public update on inspection-images" ON storage.objects;
CREATE POLICY "Allow public update on inspection-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'inspection-images');

DROP POLICY IF EXISTS "Allow public upload to processed-images" ON storage.objects;
CREATE POLICY "Allow public upload to processed-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'processed-images');

DROP POLICY IF EXISTS "Allow public select from processed-images" ON storage.objects;
CREATE POLICY "Allow public select from processed-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'processed-images');
