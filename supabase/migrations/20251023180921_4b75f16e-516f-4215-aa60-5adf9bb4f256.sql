-- Step 1: Drop the constraint first to allow updates
ALTER TABLE external_citation_health 
  DROP CONSTRAINT IF EXISTS external_citation_health_status_check;

-- Step 2: Now migrate existing data to new status values
UPDATE external_citation_health 
SET status = CASE 
  WHEN status = 'active' THEN 'healthy'
  WHEN status = 'dead' THEN 'broken'
  ELSE status
END;

-- Step 3: Add new constraint with correct values
ALTER TABLE external_citation_health 
  ADD CONSTRAINT external_citation_health_status_check 
  CHECK (status IN ('healthy', 'broken', 'redirected', 'slow', 'unreachable'));

-- Step 4: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_citation_health_status 
  ON external_citation_health(status) 
  WHERE status IN ('broken', 'unreachable');