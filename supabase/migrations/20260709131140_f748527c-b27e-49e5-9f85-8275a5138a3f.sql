ALTER TABLE public.missionary_extras
  ADD COLUMN IF NOT EXISTS idempotency_key text;

INSERT INTO public.areas (id, name, phase_id, region_id, province_id, description, gps_lat, gps_lng)
VALUES (
  'area-makilala',
  'Makilala Area',
  'phase-2',
  'region-xii',
  'cotabato',
  'Church plants across Makilala municipality — Rodero, Kisante, New Bulatukan, Sta. Felomina, Sto. Niño.',
  6.966,
  125.082
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phase_id = EXCLUDED.phase_id,
  region_id = EXCLUDED.region_id,
  province_id = EXCLUDED.province_id,
  description = EXCLUDED.description,
  gps_lat = EXCLUDED.gps_lat,
  gps_lng = EXCLUDED.gps_lng;

UPDATE public.missionary_extras
SET data = jsonb_set(data, '{areaId}', to_jsonb('area-makilala'::text), true)
WHERE data->>'areaId' IN ('area-makilala-area-mrd3retv', 'area-makilala-area');

INSERT INTO public.missionary_extras (id, data, created_by, idempotency_key)
SELECT
  'm-rogenio-david',
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(data, '{id}', to_jsonb('m-rogenio-david'::text), true),
        '{fullName}', to_jsonb('Ptr. Rogenio M. David'::text), true
      ),
      '{areaId}', to_jsonb('area-makilala'::text), true
    ),
    '{municipality}', to_jsonb('Makilala'::text), true
  ),
  created_by,
  'ptr-rogenio-m-david:area-makilala'
FROM public.missionary_extras
WHERE regexp_replace(
  regexp_replace(lower(coalesce(data->>'fullName', '')), '(^|\s)(ptr|pastor|rev|reverend)\.?\s+', ' ', 'g'),
  '[^a-z0-9]+', ' ', 'g'
) ~ '(^| )rogenio m david( |$)'
ORDER BY updated_at DESC
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  data = EXCLUDED.data,
  idempotency_key = EXCLUDED.idempotency_key,
  updated_at = now();

UPDATE public.missionary_extras
SET data = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(data, '{areaId}', to_jsonb('area-makilala'::text), true),
        '{fullName}', to_jsonb('Ptr. Rogenio M. David'::text), true
      ),
      '{province}', to_jsonb('North Cotabato'::text), true
    ),
    '{municipality}', to_jsonb('Makilala'::text), true
  ),
  idempotency_key = 'ptr-rogenio-m-david:area-makilala'
WHERE id = 'm-rogenio-david';

UPDATE public.missionary_extras
SET data = jsonb_build_object(
    '__deleted', true,
    'id', id,
    'fullName', data->>'fullName',
    'duplicateOf', 'm-rogenio-david',
    'deletedAt', now()
  ),
  idempotency_key = 'duplicate-' || id
WHERE id <> 'm-rogenio-david'
  AND regexp_replace(
    regexp_replace(lower(coalesce(data->>'fullName', '')), '(^|\s)(ptr|pastor|rev|reverend)\.?\s+', ' ', 'g'),
    '[^a-z0-9]+', ' ', 'g'
  ) ~ '(^| )rogenio m david( |$)';

WITH keyed AS (
  SELECT
    id,
    lower(trim(both '-' from regexp_replace(
      regexp_replace(lower(coalesce(data->>'fullName', id)), '(^|\s)(ptr|pastor|rev|reverend)\.?\s+', ' ', 'g'),
      '[^a-z0-9]+', '-', 'g'
    ))) || ':' || coalesce(data->>'areaId', '') AS key_base,
    row_number() OVER (
      PARTITION BY lower(trim(both '-' from regexp_replace(
        regexp_replace(lower(coalesce(data->>'fullName', id)), '(^|\s)(ptr|pastor|rev|reverend)\.?\s+', ' ', 'g'),
        '[^a-z0-9]+', '-', 'g'
      ))) || ':' || coalesce(data->>'areaId', '')
      ORDER BY updated_at DESC, id
    ) AS rn
  FROM public.missionary_extras
  WHERE coalesce(data->>'__deleted', 'false') <> 'true'
)
UPDATE public.missionary_extras me
SET idempotency_key = CASE WHEN keyed.rn = 1 THEN keyed.key_base ELSE keyed.key_base || ':duplicate-' || me.id END
FROM keyed
WHERE me.id = keyed.id;

DROP INDEX IF EXISTS public.missionary_extras_idempotency_key_key;
CREATE UNIQUE INDEX missionary_extras_idempotency_key_key
  ON public.missionary_extras (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'missionary_extras','areas','phases','regions','provinces','missionary_area_map',
    'ministry_updates','thank_you_letters','prayer_requests_db','scriptures',
    'coordinator_assignments','missionary_photos','announcements'
  ]) LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;