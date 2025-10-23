-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create scheduled job to run citation health check daily at 2 AM
SELECT cron.schedule(
  'daily-citation-health-check',
  '0 2 * * *', -- Every day at 2:00 AM
  $$
  SELECT
    net.http_post(
        url := 'https://kazggnufaoicopvmwhdl.supabase.co/functions/v1/check-citation-health',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthemdnbnVmYW9pY29wdm13aGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MzM0ODEsImV4cCI6MjA3NjEwOTQ4MX0.acQwC_xPXFXvOwwn7IATeg6OwQ2HWlu52x76iqUdhB4"}'::jsonb,
        body := concat('{"scheduled": true, "timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Grant necessary permissions for cron job
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;