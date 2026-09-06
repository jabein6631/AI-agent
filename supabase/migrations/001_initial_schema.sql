-- ==============================================================================
-- INFRA AGENT — SUPABASE DATABASE MIGRATION: 001_initial_schema.sql
-- ==============================================================================

-- 1. PROFILES TABLE (Linked directly to Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  organization TEXT DEFAULT 'Municipal Infrastructure Dept',
  role TEXT DEFAULT 'Lead Senior Inspector',
  inspector_code TEXT DEFAULT ('INSP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5))),
  accepted_terms BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Automatic Profile Creation Trigger on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, organization, role, inspector_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Inspector'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'organization', 'Municipal Infrastructure Dept'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Lead Senior Inspector'),
    'INSP-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 5))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Infrastructure Inspection',
  infrastructure_category TEXT NOT NULL DEFAULT 'Road / Pavement',
  status TEXT DEFAULT 'COMPLETED',
  location_name TEXT DEFAULT 'Guntur, Andhra Pradesh, India',
  latitude DOUBLE PRECISION DEFAULT 16.2944,
  longitude DOUBLE PRECISION DEFAULT 80.4248,
  total_detections INTEGER DEFAULT 0,
  critical_defects INTEGER DEFAULT 0,
  overall_severity TEXT DEFAULT 'MODERATE',
  overall_confidence REAL DEFAULT 0.90,
  summary_text TEXT,
  processing_time_sec REAL DEFAULT 0.0,
  original_image_url TEXT,
  annotated_image_url TEXT,
  custom_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections(created_at DESC);


-- 3. INSPECTION IMAGES METADATA TABLE
CREATE TABLE IF NOT EXISTS public.inspection_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT DEFAULT 'image/jpeg',
  file_size BIGINT DEFAULT 0,
  image_type TEXT DEFAULT 'ORIGINAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inspection_images_inspection_id ON public.inspection_images(inspection_id);


-- 4. DETECTIONS TABLE (Grounding DINO Outputs)
CREATE TABLE IF NOT EXISTS public.detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  defect_label TEXT NOT NULL,
  confidence REAL NOT NULL,
  bbox_x1 REAL NOT NULL,
  bbox_y1 REAL NOT NULL,
  bbox_x2 REAL NOT NULL,
  bbox_y2 REAL NOT NULL,
  severity TEXT DEFAULT 'MODERATE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detections_inspection_id ON public.detections(inspection_id);


-- 5. SEGMENTATION RESULTS TABLE (SAM 2.1 Outputs)
CREATE TABLE IF NOT EXISTS public.segmentation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  polygon_points JSONB NOT NULL,
  mask_area_pixels BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_segmentation_results_inspection_id ON public.segmentation_results(inspection_id);


-- 6. MEASUREMENTS TABLE
CREATE TABLE IF NOT EXISTS public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  surface_area_m2 REAL DEFAULT 0.0,
  crack_length_mm REAL DEFAULT 0.0,
  max_depth_mm REAL DEFAULT 0.0,
  unit TEXT DEFAULT 'metric',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_measurements_inspection_id ON public.measurements(inspection_id);


-- 7. RISK ASSESSMENTS TABLE
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  pci_score INTEGER DEFAULT 70,
  risk_level TEXT DEFAULT 'MODERATE',
  risk_score REAL DEFAULT 0.5,
  hazard_rating TEXT DEFAULT 'MEDIUM',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_inspection_id ON public.risk_assessments(inspection_id);


-- 8. RADIOTHERMAL RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.radiothermal_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  anomaly_index REAL DEFAULT 0.0,
  moisture_detected BOOLEAN DEFAULT false,
  thermal_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_radiothermal_results_inspection_id ON public.radiothermal_results(inspection_id);


-- 9. MAINTENANCE RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS public.maintenance_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  recommendation_text TEXT NOT NULL,
  priority TEXT DEFAULT 'HIGH',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_recommendations_inspection_id ON public.maintenance_recommendations(inspection_id);


-- 10. REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_url TEXT NOT NULL,
  file_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_inspection_id ON public.reports(inspection_id);
