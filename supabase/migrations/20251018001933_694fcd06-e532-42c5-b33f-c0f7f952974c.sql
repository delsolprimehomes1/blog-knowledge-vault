-- Add rating field (1.0 to 5.0 scale)
ALTER TABLE authors 
ADD COLUMN rating DECIMAL(2,1) DEFAULT NULL 
CHECK (rating >= 1.0 AND rating <= 5.0);

-- Add expert verified badge
ALTER TABLE authors 
ADD COLUMN is_expert_verified BOOLEAN DEFAULT false NOT NULL;

-- Add licensed professional badge
ALTER TABLE authors 
ADD COLUMN is_licensed_professional BOOLEAN DEFAULT false NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN authors.rating IS 'Author rating from 1.0 to 5.0, displayed as stars';
COMMENT ON COLUMN authors.is_expert_verified IS 'Shows "Expert Verified" badge if true';
COMMENT ON COLUMN authors.is_licensed_professional IS 'Shows "Licensed Professional" badge if true';