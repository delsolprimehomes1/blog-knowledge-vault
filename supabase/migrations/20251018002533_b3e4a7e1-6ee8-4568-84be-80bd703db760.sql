-- Update Hans Beeckman's author record with new trust signals
UPDATE authors
SET 
  rating = 4.9,
  is_expert_verified = true,
  is_licensed_professional = true
WHERE name = 'Hans Beeckman';