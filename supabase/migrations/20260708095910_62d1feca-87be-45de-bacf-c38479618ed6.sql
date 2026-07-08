
-- Scriptures table for admin-managed Scripture of the Day
CREATE TABLE public.scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  text text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.scriptures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scriptures TO authenticated;
GRANT ALL ON public.scriptures TO service_role;

ALTER TABLE public.scriptures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active scriptures"
  ON public.scriptures FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert scriptures"
  ON public.scriptures FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update scriptures"
  ON public.scriptures FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete scriptures"
  ON public.scriptures FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER scriptures_updated_at
  BEFORE UPDATE ON public.scriptures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial verses
INSERT INTO public.scriptures (reference, text, sort_order) VALUES
  ('Matthew 28:19', 'Therefore go and make disciples of all nations.', 1),
  ('Romans 10:15', 'How beautiful are the feet of those who bring good news!', 2),
  ('Isaiah 6:8', 'Here am I. Send me!', 3),
  ('Acts 1:8', 'You will be my witnesses… to the ends of the earth.', 4),
  ('Mark 16:15', 'Go into all the world and preach the gospel to all creation.', 5),
  ('Psalm 96:3', 'Declare his glory among the nations, his marvelous deeds among all peoples.', 6),
  ('Matthew 9:37-38', 'The harvest is plentiful but the workers are few.', 7),
  ('Romans 1:16', 'I am not ashamed of the gospel — it is the power of God for salvation.', 8),
  ('1 Corinthians 15:58', 'Your labor in the Lord is not in vain.', 9),
  ('Isaiah 52:7', 'How beautiful on the mountains are the feet of those who bring good news.', 10),
  ('John 4:35', 'Look at the fields! They are ripe for harvest.', 11),
  ('Luke 10:2', 'Ask the Lord of the harvest to send out workers into his harvest field.', 12);
