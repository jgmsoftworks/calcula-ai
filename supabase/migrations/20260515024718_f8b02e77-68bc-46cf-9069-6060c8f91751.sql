
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('purge-deleted-accounts-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-deleted-accounts-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://pohtomqnjpnuvuccorov.supabase.co/functions/v1/purge-deleted-accounts',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvaHRvbXFuanBudXZ1Y2Nvcm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NDUyNzEsImV4cCI6MjA3MjQyMTI3MX0.fdR-NHVyM1dntPFjemd99iTpCNEK1tL5V2QX_LLwS24"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
