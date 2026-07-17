
CREATE TABLE public.telegram_users (
  chat_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_users TO service_role;
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
