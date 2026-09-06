-- ==============================================================================
-- INFRA AGENT — SUPABASE MIGRATION: 004_seed_all_tables.sql
-- Seeds 5+ Realistic Inspection Records across ALL 10 Supabase Tables
-- ==============================================================================

-- 1. MAKE USER_ID NULLABLE FOR GUEST / SEED COMPATIBILITY
ALTER TABLE public.inspections ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.inspection_images ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.reports ALTER COLUMN user_id DROP NOT NULL;

-- 2. ENABLE PUBLIC ACCESS / DISABLE STRICT RLS FOR SEEDING
ALTER TABLE public.radiothermal_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_recommendations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;

-- 3. SEED INSPECTIONS (5 Detailed Field Surveys)
INSERT INTO public.inspections (
  id, user_id, title, infrastructure_category, status, location_name, 
  latitude, longitude, total_detections, critical_defects, overall_severity, 
  overall_confidence, summary_text, processing_time_sec, original_image_url
)
VALUES 
  (
    '11111111-1111-4111-8111-111111111111', 
    NULL,
    'NH-16 Asphalt Pothole & Alligator Crack Survey', 
    'Road / Pavement', 'COMPLETED', 'Guntur Ring Road, AP, India',
    16.3067, 80.4365, 4, 2, 'HIGH', 0.96,
    'Multiple high-severity potholes and interconnected alligator cracking detected on primary traffic lane.',
    4.12, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/sample_pothole.jpg'
  ),
  (
    '22222222-2222-4222-8222-222222222222', 
    NULL,
    'Commercial Tower Facade Fissure Audit', 
    'Building Structure', 'COMPLETED', 'MG Road Financial District, Vijayawada',
    16.5062, 80.6480, 3, 1, 'MODERATE', 0.94,
    'Structural concrete wall shows thermal expansion cracks and localized spalling near beam joint.',
    3.85, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/sample_building.jpg'
  ),
  (
    '33333333-3333-4333-8333-333333333333', 
    NULL,
    'Prakasam Barrage Bridge Deck Concrete Inspection', 
    'Bridge / Flyover', 'COMPLETED', 'Krishna River Span 4, AP',
    16.5103, 80.6054, 5, 2, 'CRITICAL', 0.98,
    'Exposed rebar, concrete delamination, and sub-surface moisture intrusion detected on pier cap.',
    5.40, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/sample_bridge.jpg'
  ),
  (
    '44444444-4444-4444-8444-444444444444', 
    NULL,
    'Main Stormwater Canal Sedimentation & Wall Crack', 
    'Drainage & Water', 'COMPLETED', 'Auto Nagar Sector 3 Drain, Guntur',
    16.2944, 80.4248, 2, 0, 'LOW', 0.91,
    'Minor hair-line cracks on side wall lining with partial debris accumulation in flow channel.',
    3.10, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/sample_drainage.jpg'
  ),
  (
    '55555555-5555-4555-8555-555555555555', 
    NULL,
    'Municipal Highway Retaining Wall Integrity Check', 
    'Other Public Infra', 'COMPLETED', 'Hillpass Retaining Wall KM 14',
    16.3210, 80.4100, 3, 1, 'MODERATE', 0.93,
    'Vertical structural joint separation observed with ground settlement indicators at wall footing.',
    4.05, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/sample_retaining.jpg'
  )
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;


-- 4. SEED INSPECTION IMAGES METADATA
INSERT INTO public.inspection_images (id, inspection_id, user_id, storage_path, file_name, mime_type, file_size, image_type)
VALUES 
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', NULL, 'uploads/pothole_nh16.jpg', 'pothole_nh16.jpg', 'image/jpeg', 245120, 'ORIGINAL'),
  ('a2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', NULL, 'uploads/building_facade.jpg', 'building_facade.jpg', 'image/jpeg', 312040, 'ORIGINAL'),
  ('a3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', NULL, 'uploads/bridge_pier.jpg', 'bridge_pier.jpg', 'image/jpeg', 489100, 'ORIGINAL'),
  ('a4444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', NULL, 'uploads/canal_drain.jpg', 'canal_drain.jpg', 'image/jpeg', 198400, 'ORIGINAL'),
  ('a5555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', NULL, 'uploads/retaining_wall.jpg', 'retaining_wall.jpg', 'image/jpeg', 376800, 'ORIGINAL')
ON CONFLICT (id) DO NOTHING;


-- 5. SEED DETECTIONS (Grounding DINO Outputs)
INSERT INTO public.detections (id, inspection_id, defect_label, confidence, bbox_x1, bbox_y1, bbox_x2, bbox_y2, severity)
VALUES 
  ('b1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Deep Pothole', 0.97, 0.22, 0.35, 0.58, 0.72, 'HIGH'),
  ('b1111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', 'Longitudinal Crack', 0.92, 0.10, 0.15, 0.45, 0.88, 'HIGH'),
  ('b2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Concrete Wall Fissure', 0.94, 0.30, 0.20, 0.75, 0.60, 'MODERATE'),
  ('b3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'Exposed Rebar Corrosion', 0.98, 0.15, 0.40, 0.65, 0.85, 'HIGH'),
  ('b4444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', 'Hairline Wall Joint Crack', 0.89, 0.05, 0.10, 0.90, 0.30, 'LOW')
ON CONFLICT (id) DO NOTHING;


-- 6. SEED SEGMENTATION RESULTS (SAM 2.1 Outputs)
INSERT INTO public.segmentation_results (id, inspection_id, polygon_points, mask_area_pixels)
VALUES 
  ('c1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '[{"x": 120, "y": 150}, {"x": 340, "y": 160}, {"x": 320, "y": 380}, {"x": 110, "y": 370}]'::jsonb, 48200),
  ('c2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', '[{"x": 200, "y": 80}, {"x": 500, "y": 90}, {"x": 480, "y": 250}, {"x": 190, "y": 240}]'::jsonb, 31500),
  ('c3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', '[{"x": 80, "y": 200}, {"x": 620, "y": 220}, {"x": 600, "y": 450}, {"x": 75, "y": 430}]'::jsonb, 92400),
  ('c4444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', '[{"x": 50, "y": 50}, {"x": 400, "y": 55}, {"x": 390, "y": 180}, {"x": 45, "y": 175}]'::jsonb, 18600),
  ('c5555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', '[{"x": 150, "y": 100}, {"x": 450, "y": 110}, {"x": 440, "y": 300}, {"x": 140, "y": 290}]'::jsonb, 41200)
ON CONFLICT (id) DO NOTHING;


-- 7. SEED MEASUREMENTS
INSERT INTO public.measurements (id, inspection_id, surface_area_m2, crack_length_mm, max_depth_mm, unit)
VALUES 
  ('d1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 1.85, 1420.0, 78.5, 'metric'),
  ('d2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 0.65, 890.0, 24.0, 'metric'),
  ('d3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 4.12, 2850.0, 115.0, 'metric'),
  ('d4444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', 0.35, 450.0, 12.0, 'metric'),
  ('d5555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', 1.40, 1100.0, 42.0, 'metric')
ON CONFLICT (id) DO NOTHING;


-- 8. SEED RISK ASSESSMENTS
INSERT INTO public.risk_assessments (id, inspection_id, pci_score, risk_level, risk_score, hazard_rating)
VALUES 
  ('e1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 42, 'HIGH RISK', 0.88, 'HIGH'),
  ('e2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 68, 'MODERATE RISK', 0.52, 'MEDIUM'),
  ('e3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 28, 'CRITICAL RISK', 0.95, 'EXTREME'),
  ('e4444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', 85, 'LOW RISK', 0.22, 'LOW'),
  ('e5555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', 61, 'MODERATE RISK', 0.60, 'MEDIUM')
ON CONFLICT (id) DO NOTHING;


-- 9. SEED RADIOTHERMAL RESULTS
INSERT INTO public.radiothermal_results (id, inspection_id, anomaly_index, moisture_detected, thermal_image_url)
VALUES 
  ('f1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 0.78, true, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/thermal_nh16.png'),
  ('f2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 0.45, false, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/thermal_facade.png'),
  ('f3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 0.92, true, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/thermal_bridge.png'),
  ('f4444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', 0.21, true, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/thermal_drain.png'),
  ('f5555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', 0.58, false, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/inspection-images/uploads/thermal_retaining.png')
ON CONFLICT (id) DO NOTHING;


-- 10. SEED MAINTENANCE RECOMMENDATIONS
INSERT INTO public.maintenance_recommendations (id, inspection_id, recommendation_text, priority)
VALUES 
  ('a1000000-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Full asphalt cold milling, polymer-modified bitumen injection, and surface sealing within 14 days.', 'URGENT'),
  ('a2000000-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Epoxy crack injection seal and exterior waterproof sealant application before monsoon season.', 'HIGH'),
  ('a3000000-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'Immediate pier jacket jacketing, sacrificial anode installation, and load-limit restriction.', 'CRITICAL'),
  ('a4000000-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', 'Desilting flow channel and minor mortar pointing along wall joints during routine maintenance.', 'LOW'),
  ('a5000000-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', 'Soil tie-back anchor tension test and weep-hole clearing to prevent hydrostatic pressure build-up.', 'HIGH')
ON CONFLICT (id) DO NOTHING;


-- 11. SEED REPORTS
INSERT INTO public.reports (id, inspection_id, user_id, report_url, file_size_bytes)
VALUES 
  ('b1000000-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', NULL, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/reports/report_nh16.pdf', 1450200),
  ('b2000000-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', NULL, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/reports/report_building.pdf', 1120000),
  ('b3000000-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', NULL, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/reports/report_bridge.pdf', 2340800),
  ('b4000000-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', NULL, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/reports/report_drain.pdf', 890500),
  ('b5000000-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', NULL, 'https://byexjyvxykptwqobesor.supabase.co/storage/v1/object/public/reports/report_retaining.pdf', 1670300)
ON CONFLICT (id) DO NOTHING;
