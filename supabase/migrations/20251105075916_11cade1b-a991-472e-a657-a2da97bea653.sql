-- Update old banned_domain alerts to use competitor_citation type
UPDATE citation_compliance_alerts 
SET alert_type = 'competitor_citation'
WHERE alert_type = 'banned_domain' 
  AND resolved_at IS NULL;