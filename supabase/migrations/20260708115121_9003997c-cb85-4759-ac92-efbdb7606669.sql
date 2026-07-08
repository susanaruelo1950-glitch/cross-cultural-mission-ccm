
ALTER TABLE public.missionary_photos ADD COLUMN IF NOT EXISTS cover_url text;

ALTER TABLE public.thank_you_letters ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS thank_you_letters_missionary_sort_idx
  ON public.thank_you_letters (missionary_id, sort_order, letter_date DESC);
