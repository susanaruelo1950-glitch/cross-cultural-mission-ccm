CREATE TABLE public.backup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  frequency text NOT NULL DEFAULT 'off',
  target text NOT NULL DEFAULT 'github',
  github_owner text,
  github_repo text,
  github_branch text,
  github_folder text DEFAULT 'backups',
  include_storage boolean NOT NULL DEFAULT false,
  include_auth_users boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT backup_settings_singleton_uq UNIQUE (singleton),
  CONSTRAINT backup_settings_frequency_chk CHECK (frequency IN ('off','daily','weekly','monthly')),
  CONSTRAINT backup_settings_target_chk CHECK (target IN ('github','drive','both'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_settings TO authenticated;
GRANT ALL ON public.backup_settings TO service_role;
ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage backup settings" ON public.backup_settings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  target text NOT NULL,
  status text NOT NULL,
  detail text,
  tables_count integer NOT NULL DEFAULT 0,
  files_count integer NOT NULL DEFAULT 0,
  bytes bigint NOT NULL DEFAULT 0,
  location_url text,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read backup runs" ON public.backup_runs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert backup runs" ON public.backup_runs FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER backup_settings_updated_at BEFORE UPDATE ON public.backup_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.backup_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;