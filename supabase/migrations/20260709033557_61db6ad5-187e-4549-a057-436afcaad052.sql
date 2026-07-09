-- Add missing Kidapawan Area to the DB-backed directory so it appears on the
-- dashboard, filter bar, and missionary directory.
INSERT INTO public.areas (id, name, phase_id, region_id, province_id, description, gps_lat, gps_lng)
VALUES (
  'area-kidapawan',
  'Kidapawan Area',
  'phase-2',
  'region-xii',
  'cotabato',
  'Alliance and Evangelical church plants across Kidapawan City, Makilala, and President Roxas.',
  7.008,
  125.089
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phase_id = EXCLUDED.phase_id,
  region_id = EXCLUDED.region_id,
  province_id = EXCLUDED.province_id,
  description = EXCLUDED.description,
  gps_lat = COALESCE(public.areas.gps_lat, EXCLUDED.gps_lat),
  gps_lng = COALESCE(public.areas.gps_lng, EXCLUDED.gps_lng);
