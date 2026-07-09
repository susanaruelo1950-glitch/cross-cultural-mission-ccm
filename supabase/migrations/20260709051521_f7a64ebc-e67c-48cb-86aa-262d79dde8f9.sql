CREATE POLICY "Admins can delete activity log" ON public.activity_log
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));